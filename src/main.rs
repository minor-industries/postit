#[macro_use] extern crate rocket;
use rocket::fs::{FileServer, NamedFile};
use rocket::response::Redirect;
use rocket::serde::json::Json;
use rocket::State;
use std::net::SocketAddr;
use std::path::PathBuf;
use structopt::StructOpt;
use rust_embed::RustEmbed;
use sqlx::SqlitePool;
use anyhow::Result;

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

#[get("/")]
fn index() -> Redirect {
    Redirect::temporary(uri!(postit))
}

#[get("/postit.html")]
async fn postit(static_path: &State<Option<String>>) -> Option<NamedFile> {
    if let Some(path) = &**static_path {
        NamedFile::open(PathBuf::from(path).join("postit.html")).await.ok()
    } else {
        NamedFile::open(PathBuf::from("static/postit.html")).await.ok()
    }
}

#[post("/twirp/kv.KVService/LoadValue", data = "<key>")]
async fn load_value(db: &State<SqlitePool>, key: String) -> Result<Json<Option<String>>, std::io::Error> {
    let value = load(db.inner(), &key).await.map_err(|e| {
        eprintln!("Failed to load value: {}", e);
        std::io::Error::new(std::io::ErrorKind::Other, "Failed to load value")
    })?;
    Ok(Json(value))
}

#[launch]
fn rocket() -> _ {
    let opt = Opt::from_args();

    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    let db = tokio::runtime::Runtime::new().unwrap().block_on(init_db("example.db")).unwrap();

    rocket::custom(rocket::Config {
        address: addr.ip(),
        port: addr.port(),
        ..rocket::Config::default()
    })
        .manage(db)
        .manage(opt.static_path.clone())
        .mount("/", routes![index, postit, load_value])
        .mount("/static", FileServer::from("static"))
}
