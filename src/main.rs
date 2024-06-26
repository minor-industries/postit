#[macro_use] extern crate rocket;
use rocket::fs::{FileServer, NamedFile};
use rocket::response::Redirect;
use rocket::serde::json::Json;
use rocket::State;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::fs::read_to_string;
use structopt::StructOpt;
use rust_embed::RustEmbed;

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

use rocket::response::content::RawJson;

#[post("/twirp/kv.KVService/LoadValue")]
fn load_value() -> Result<RawJson<String>, std::io::Error> {
    use std::fs::read_to_string;

    // Read the JSON file into a string and handle any errors
    let json_string = read_to_string("response.json")?;

    // Print the JSON string to the console
    println!("Loaded JSON: {}", json_string);

    Ok(RawJson(json_string))
}

#[launch]
fn rocket() -> _ {
    let opt = Opt::from_args();

    let addr: SocketAddr = opt.addr.parse().expect("invalid address");

    rocket::custom(rocket::Config {
        address: addr.ip(),
        port: addr.port(),
        ..rocket::Config::default()
    })
        .manage(opt.static_path.clone())
        .mount("/", routes![index, postit, load_value])
        .mount("/static", FileServer::from("static"))
}
