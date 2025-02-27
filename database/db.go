package database

import (
	"github.com/glebarez/sqlite"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

type KeyValue struct {
	Key   string `gorm:"primaryKey"`
	Value string
}

func InitDB(dbPath string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&KeyValue{}); err != nil {
		return nil, errors.Wrap(err, "auto migrate db")
	}
	return db, nil
}

func Save(db *gorm.DB, key, value string) error {
	return db.Save(&KeyValue{Key: key, Value: value}).Error
}

func Load(db *gorm.DB, key string) (string, bool, error) {
	var kv KeyValue
	if err := db.First(&kv, "key = ?", key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", false, nil
		}
		return "", false, err
	}
	return kv.Value, true, nil
}
