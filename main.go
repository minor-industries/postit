package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jessevdk/go-flags"
	"github.com/pkg/errors"
	"os"
	"postit/database"
	"postit/kv_service/kv"
)

var args struct {
	Addr string `long:"addr" env:"ADDR" default:":8000" description:"server address"`
}

func run() error {
	_, err := flags.Parse(&args)
	if err != nil {
		return errors.Wrap(err, "parse args")
	}

	r := gin.Default()

	db, err := database.InitDB()
	if err != nil {
		panic("failed to connect database")
	}

	s := &server{db: db}
	r.POST("/twirp/kv.KVService/*Method", gin.WrapH(kv.NewKVServiceServer(s, nil)))

	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")

	return r.Run(args.Addr)
}

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "%s\n", err.Error())
		os.Exit(1)
	}
}
