use axum::{
    extract::{Extension, Path},
    response::{Html, Redirect, Response},
    routing::{get, post},
    Router,
};
use mime_guess::from_path;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, sync::Arc};
use structopt::StructOpt;
use tower::ServiceBuilder;
use tower_http::services::ServeDir;

mod db;
mod load_save;

use crate::db::db::init_db;
use crate::load_save::{handle_load_value, handle_save_value};

#[derive(StructOpt, Debug)]
#[structopt(name = "postit")]
struct Opt {
    #[structopt(long, env = "ADDR", default_value = "127.0.0.1:8000")]
    addr: String,
}

#[derive(RustEmbed)]
#[folder = "static/"]
struct StaticFiles;

async fn handle_index() -> Redirect {
    Redirect::temporary("/postit.html")
}

async fn serve_embed_file(filename: &str) -> Result<Response, axum::http::StatusCode> {
    let file = StaticFiles::get(filename);
    match file {
        Some(content) => {
            let mime_type = from_path(filename).first_or_octet_stream();
            let body = content.data.as_ref().to_vec();
            Ok(Response::builder()
                .header(axum::http::header::CONTENT_TYPE, mime_type.as_ref())
                .body(body.into())
                .unwrap())
        }
        None => Err(axum::http::StatusCode::NOT_FOUND),
    }
}

#[tokio::main]
async fn main() {
    let opt = Opt::from_args();
    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    let db = init_db("example.db").await.unwrap();
    let db = Arc::new(db);

    let app = Router::new()
        .route("/", get(handle_index))
        .route("/postit.html", get(|| async { serve_embed_file("postit.html").await }))
        .route(
            "/twirp/kv.KVService/LoadValue",
            post(handle_load_value),
        )
        .route(
            "/twirp/kv.KVService/SaveValue",
            post(handle_save_value),
        )
        .route("/static/*file", get(|Path(file): Path<String>| async move {
            let result = serve_embed_file(&file).await;
            match result {
                Ok(result) => {
                    println!("path = {:?}, ok = {}", file, true);
                    result
                }
                Err(E) => panic!("{}", E)
            }
        }))
        .layer(Extension(db));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
