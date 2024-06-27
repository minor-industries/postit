use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Response, Server, StatusCode};
use hyper::header::LOCATION;
use hyper::http::Method;
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
use crate::db::db::{init_db, load};

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
    let file_path = if let Some(ref path) = *static_path {
        PathBuf::from(path).join("postit.html")
    } else {
        PathBuf::from("static/postit.html")
    };

    match File::open(file_path).await {
        Ok(mut file) => {
            let mut contents = Vec::new();
            file.read_to_end(&mut contents).await.unwrap();
            Ok(Response::new(Body::from(contents)))
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

            // Determine the content type based on the file extension
            let mime_type = match file_path.extension().and_then(std::ffi::OsStr::to_str) {
                Some("html") => "text/html",
                Some("css") => "text/css",
                Some("js") => "application/javascript",
                Some("png") => "image/png",
                Some("jpg") | Some("jpeg") => "image/jpeg",
                Some("gif") => "image/gif",
                Some("svg") => "image/svg+xml",
                Some("json") => "application/json",
                _ => "application/octet-stream",
            };

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type)
                .body(Body::from(contents))
                .unwrap())
        }
        Err(_) => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("File not found"))
            .unwrap()),
    }
}

async fn handle_load_value(db: Arc<SqlitePool>, req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let whole_body = hyper::body::to_bytes(req.into_body()).await.unwrap();
    let key = String::from_utf8(whole_body.to_vec()).unwrap();

    match load(&db, &key).await {
        Ok(value) => {
            let json_response = json!(value);
            Ok(Response::new(Body::from(json_response.to_string())))
        }
        Err(e) => {
            eprintln!("Failed to load value: {}", e);
            Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Failed to load value"))
                .unwrap())
        }
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
        (&Method::POST, "/twirp/kv.KVService/LoadValue") => handle_load_value(db, req).await,
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
