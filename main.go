package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")
	r.Run(":8081")
}
