use axum::{
    body::Body,
    extract::Extension,
    http::{Response, StatusCode},
    response::{IntoResponse, Redirect},
    routing::{get, post},
    Router,
};
use axum::routing::get_service;
use mime_guess::from_path;
use rust_embed::RustEmbed;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use structopt::StructOpt;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tower_http::services::ServeDir;

mod db;
mod load_save;

use crate::db::db::{init_db};
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

async fn handle_index() -> Redirect {
    Redirect::temporary("/postit.html")
}

async fn handle_postit(Extension(static_path): Extension<Arc<Option<String>>>) -> impl IntoResponse {
    let req_path = "postit.html";
    let file_path = match &*static_path {
        Some(path) => PathBuf::from(path).join(req_path),
        None => PathBuf::from("static").join(req_path),
    };

    match File::open(&file_path).await {
        Ok(mut file) => {
            let mut contents = Vec::new();
            if let Err(e) = file.read_to_end(&mut contents).await {
                eprintln!("Error reading file {}: {}", file_path.display(), e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal Server Error".to_string(),
                )
                    .into_response();
            }
            let mime_type = from_path(&file_path).first_or_octet_stream();
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type.as_ref())
                .body(Body::from(contents))
                .unwrap()
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "File not found".to_string()).into_response(),
    }
}

#[tokio::main]
async fn main() {
    let opt = Opt::from_args();
    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    let db = init_db("example.db").await.unwrap();
    let db = Arc::new(db);
    let static_path = Arc::new(opt.static_path.clone());

    let app = Router::new()
        .route("/", get(handle_index))
        .route("/postit.html", get(handle_postit))
        .route(
            "/twirp/kv.KVService/LoadValue",
            post(handle_load_value),
        )
        .route(
            "/twirp/kv.KVService/SaveValue",
            post(handle_save_value),
        )
        .nest_service("/static", get_service(ServeDir::new("static")))
        .layer(Extension(db))
        .layer(Extension(static_path));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
