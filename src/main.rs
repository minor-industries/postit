use axum::{
    extract::Extension,
    response::Redirect,
    routing::{get, post},
    Router,
};
use axum::routing::get_service;
use std::net::SocketAddr;
use std::sync::Arc;
use std::path::PathBuf;
use structopt::StructOpt;
use tower_http::services::{ServeDir, ServeFile};

mod db;
mod load_save;

use crate::db::db::init_db;
use crate::load_save::{handle_load_value, handle_save_value};

#[derive(StructOpt, Debug)]
#[structopt(name = "postit")]
struct Opt {
    #[structopt(long, env = "ADDR", default_value = "127.0.0.1:8000")]
    addr: String,

    #[structopt(long = "static-path")]
    static_path: Option<String>,
}

async fn handle_index() -> Redirect {
    Redirect::temporary("/postit.html")
}

#[tokio::main]
async fn main() {
    let opt = Opt::from_args();
    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    let db = init_db("example.db").await.unwrap();
    let db = Arc::new(db);
    let static_path = Arc::new(opt.static_path.clone());

    let postit_path = if let Some(path) = &*static_path {
        PathBuf::from(path).join("postit.html")
    } else {
        PathBuf::from("static").join("postit.html")
    };

    let app = Router::new()
        .route("/", get(handle_index))
        .nest_service("/postit.html", get_service(ServeFile::new(postit_path)))
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
