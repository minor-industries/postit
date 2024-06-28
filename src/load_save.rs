use axum::{
    body::Bytes,
    extract::{Extension, Json},
    http::{Response, StatusCode},
    response::IntoResponse,
    routing::{post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use crate::db::db::{load, save};

#[derive(Deserialize)]
pub struct SaveValueRequest {
    key: String,
    value: String,
}

#[derive(Serialize)]
struct SaveValueResponse {
    success: bool,
}

#[derive(Deserialize)]
pub struct LoadValueRequest {
    key: String,
}

#[derive(Serialize)]
struct LoadValueResponse {
    value: Option<String>,
    found: bool,
}

pub async fn handle_save_value(
    Extension(db): Extension<Arc<SqlitePool>>,
    Json(req): Json<SaveValueRequest>,
) -> impl IntoResponse {
    match save(&db, &req.key, &req.value).await {
        Ok(_) => {
            let res = SaveValueResponse { success: true };
            Json(res).into_response()
        }
        Err(e) => {
            eprintln!("Failed to save value: {}", e);
            let res = SaveValueResponse { success: false };
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(res),
            ).into_response()
        }
    }
}

pub async fn handle_load_value(
    Extension(db): Extension<Arc<SqlitePool>>,
    Json(req): Json<LoadValueRequest>,
) -> impl IntoResponse {
    match load(&db, &req.key).await {
        Ok(Some(value)) => {
            let res = LoadValueResponse { value: Some(value), found: true };
            Json(res).into_response()
        }
        Ok(None) => {
            let res = LoadValueResponse { value: None, found: false };
            Json(res).into_response()
        }
        Err(e) => {
            eprintln!("Failed to load value: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to load value",
            ).into_response()
        }
    }
}
