use axum::{
    extract::{Extension, Path},
    response::{Redirect, Response},
    routing::{get, post, get_service},
    Router,
};
use mime_guess::from_path;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, sync::Arc};
use structopt::StructOpt;
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

    #[structopt(long, env = "STATIC_DIR", default_value = "")]
    static_dir: String,
}

#[derive(RustEmbed)]
#[folder = "static/"]
struct StaticFiles;

async fn serve_embed_file(Path(file): Path<String>) -> Result<Response, axum::http::StatusCode> {
    let file_content = StaticFiles::get(&file);
    match file_content {
        Some(content) => {
            let mime_type = from_path(&file).first_or_octet_stream();
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
        .route("/", get(|| async { Redirect::temporary("/static/postit.html") }))
        .route(
            "/twirp/kv.KVService/LoadValue",
            post(handle_load_value),
        )
        .route(
            "/twirp/kv.KVService/SaveValue",
            post(handle_save_value),
        )
        .layer(Extension(db));

    let app = if !opt.static_dir.is_empty() {
        app.nest_service("/static", get_service(ServeDir::new(opt.static_dir.clone())))
    } else {
        app.route("/static/*file", get(serve_embed_file))
    };

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
