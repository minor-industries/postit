use anyhow::{Context, Result};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use crate::db::models::KeyValue;

pub async fn init_db(db_path: &str) -> Result<Pool<Sqlite>> {
    let db_url = format!("sqlite:{}", db_path);
    let pool = SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .context("Failed to connect to the database")?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS key_values (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#
    )
        .execute(&pool)
        .await
        .context("Failed to migrate the database")?;

    Ok(pool)
}

pub async fn save(db: &Pool<Sqlite>, key: &str, value: &str) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO key_values (key, value)
        VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value;
        "#
    )
        .bind(key)
        .bind(value)
        .execute(db)
        .await
        .context("Failed to save the key-value pair")?;

    Ok(())
}

pub async fn load(db: &Pool<Sqlite>, key: &str) -> Result<Option<String>> {
    let result: Option<KeyValue> = sqlx::query_as(
        r#"
        SELECT key, value FROM key_values WHERE key = ?1;
        "#
    )
        .bind(key)
        .fetch_optional(db)
        .await
        .context("Failed to load the key-value pair")?;

    Ok(result.map(|kv| kv.value))
}
