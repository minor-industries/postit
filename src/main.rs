use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Response, Server, StatusCode};
use hyper::header::LOCATION;
use hyper::http::Method;
use mime_guess::from_path;
use serde_json::json;
use sqlx::SqlitePool;
use structopt::StructOpt;
use rust_embed::RustEmbed;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Arc;
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

mod db;
mod load_save;

use crate::db::db::{init_db, load, save};
use crate::load_save::{handle_load_value, handle_save_value};

#[derive(StructOpt, Debug)]
#[structopt(name = "postit")]
struct Opt {
    #[structopt(long, env = "ADDR", default_value = "127.0.0.1:8000")]
    addr: String,

    #[structopt(long = "static-path")]
    static_path: Option<String>,
}

#[derive(RustEmbed)]
#[folder = "static/"]
struct Asset;

async fn handle_index() -> Result<Response<Body>, Infallible> {
    Ok(Response::builder()
        .status(StatusCode::TEMPORARY_REDIRECT)
        .header(LOCATION, "/postit.html")
        .body(Body::empty())
        .unwrap())
}

async fn handle_postit(static_path: Arc<Option<String>>) -> Result<Response<Body>, Infallible> {
    let req_path = "postit.html";

    // Construct the full file path
    let file_path = match &*static_path {
        Some(path) => PathBuf::from(path).join(req_path),
        None => PathBuf::from("static").join(req_path),
    };

    // Open the file and read its contents
    match File::open(&file_path).await {
        Ok(mut file) => {
            let mut contents = Vec::new();
            if let Err(e) = file.read_to_end(&mut contents).await {
                eprintln!("Error reading file {}: {}", file_path.display(), e);
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(Body::from("Internal Server Error"))
                    .unwrap());
            }

            // Determine the content type using mime_guess
            let mime_type = from_path(&file_path).first_or_octet_stream();

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type.as_ref())
                .body(Body::from(contents))
                .unwrap())
        }
        Err(_) => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("File not found"))
            .unwrap()),
    }
}

async fn handle_static_file(static_path: Arc<Option<String>>, req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let req_path = req.uri().path().trim_start_matches('/');

    // Construct the full file path
    let file_path = match &*static_path {
        Some(path) => PathBuf::from(path).join(req_path.trim_start_matches("static/")),
        None => PathBuf::from("static").join(req_path.trim_start_matches("static/")),
    };

    // Open the file and read its contents
    match File::open(&file_path).await {
        Ok(mut file) => {
            let mut contents = Vec::new();
            if let Err(e) = file.read_to_end(&mut contents).await {
                eprintln!("Error reading file {}: {}", file_path.display(), e);
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(Body::from("Internal Server Error"))
                    .unwrap());
            }

            // Determine the content type using mime_guess
            let mime_type = from_path(&file_path).first_or_octet_stream();

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type.as_ref())
                .body(Body::from(contents))
                .unwrap())
        }
        Err(_) => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("File not found"))
            .unwrap()),
    }
}


async fn handle_request(
    req: Request<Body>,
    static_path: Arc<Option<String>>,
    db: Arc<SqlitePool>,
) -> Result<Response<Body>, Infallible> {
    match (req.method(), req.uri().path()) {
        (&Method::GET, "/") => handle_index().await,
        (&Method::GET, "/postit.html") => handle_postit(static_path.clone()).await,
        (&Method::POST, "/twirp/kv.KVService/LoadValue") => handle_load_value(db.clone(), req).await,
        (&Method::POST, "/twirp/kv.KVService/SaveValue") => handle_save_value(db.clone(), req).await,
        _ if req.uri().path().starts_with("/static/") => handle_static_file(static_path, req).await,
        _ => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("Not Found"))
            .unwrap()),
    }
}

#[tokio::main]
async fn main() {
    let opt = Opt::from_args();
    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    let db = init_db("example.db").await.unwrap();
    let db = Arc::new(db);
    let static_path = Arc::new(opt.static_path.clone());

    let make_svc = make_service_fn(move |_| {
        let static_path = static_path.clone();
        let db = db.clone();
        async {
            Ok::<_, Infallible>(service_fn(move |req| {
                handle_request(req, static_path.clone(), db.clone())
            }))
        }
    });

    let server = Server::bind(&addr).serve(make_svc);

    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }
}
