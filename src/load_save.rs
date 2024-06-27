use serde::{Deserialize, Serialize};
use hyper::{Body, Request, Response, StatusCode};
use sqlx::SqlitePool;
use std::convert::Infallible;
use std::sync::Arc;
use crate::db::db::{load, save};

#[derive(Deserialize)]
struct SaveValueRequest {
    key: String,
    value: String,
}

#[derive(Serialize)]
struct SaveValueResponse {
    success: bool,
}

#[derive(Deserialize)]
struct LoadValueRequest {
    key: String,
}

#[derive(Serialize)]
struct LoadValueResponse {
    value: Option<String>,
    found: bool,
}

pub async fn handle_save_value(db: Arc<SqlitePool>, req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let whole_body = match hyper::body::to_bytes(req.into_body()).await {
        Ok(body) => body,
        Err(_) => {
            eprintln!("Failed to read request body");
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid request body"))
                .unwrap());
        }
    };

    let req: SaveValueRequest = match serde_json::from_slice(&whole_body) {
        Ok(json) => json,
        Err(_) => {
            eprintln!("Failed to parse JSON from request body");
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid JSON"))
                .unwrap());
        }
    };

    match save(&db, &req.key, &req.value).await {
        Ok(_) => {
            let res = SaveValueResponse { success: true };
            let body = serde_json::to_string(&res).unwrap();
            Ok(Response::new(Body::from(body)))
        }
        Err(e) => {
            eprintln!("Failed to save value: {}", e);
            let res = SaveValueResponse { success: false };
            let body = serde_json::to_string(&res).unwrap();
            Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(body))
                .unwrap())
        }
    }
}

pub async fn handle_load_value(db: Arc<SqlitePool>, req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let whole_body = match hyper::body::to_bytes(req.into_body()).await {
        Ok(body) => body,
        Err(_) => {
            eprintln!("Failed to read request body");
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid request body"))
                .unwrap());
        }
    };

    let req: LoadValueRequest = match serde_json::from_slice(&whole_body) {
        Ok(json) => json,
        Err(_) => {
            eprintln!("Failed to parse JSON from request body");
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid JSON"))
                .unwrap());
        }
    };

    match load(&db, &req.key).await {
        Ok(Some(value)) => {
            let res = LoadValueResponse { value: Some(value), found: true };
            let body = serde_json::to_string(&res).unwrap();
            Ok(Response::new(Body::from(body)))
        }
        Ok(None) => {
            let res = LoadValueResponse { value: None, found: false };
            let body = serde_json::to_string(&res).unwrap();
            Ok(Response::new(Body::from(body)))
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
