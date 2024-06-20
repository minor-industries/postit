package main

import (
	"context"
	"postit/database"
	"postit/kv_service/kv"

	"gorm.io/gorm"
)

type server struct {
	db *gorm.DB
}

func (s *server) SaveValue(ctx context.Context, req *kv.SaveValueRequest) (*kv.SaveValueResponse, error) {
	err := database.Save(s.db, req.Key, req.Value)
	if err != nil {
		return nil, err
	}
	return &kv.SaveValueResponse{Success: true}, nil
}

func (s *server) LoadValue(ctx context.Context, req *kv.LoadValueRequest) (*kv.LoadValueResponse, error) {
	value, found, err := database.Load(s.db, req.Key)
	if err != nil {
		return nil, err
	}
	return &kv.LoadValueResponse{Value: value, Found: found}, nil
}
