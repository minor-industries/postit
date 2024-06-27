use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct KeyValue {
    pub key: String,
    pub value: String,
}
