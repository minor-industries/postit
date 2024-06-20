package main

import (
	"github.com/gin-gonic/gin"
	"postit/database"
	"postit/kv_service/kv"
)

func main() {
	r := gin.Default()

	db, err := database.InitDB()
	if err != nil {
		panic("failed to connect database")
	}

	s := &server{db: db}
	r.POST("/twirp/kv.KVService/*Method", gin.WrapH(kv.NewKVServiceServer(s, nil)))

	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")

	r.Run(":8000")
}
