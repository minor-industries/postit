package main

import (
	"embed"
	"encoding/base64"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jessevdk/go-flags"
	"github.com/pkg/errors"
	"io/fs"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"postit/database"
	"postit/kv_service/kv"
	"strings"
)

var args struct {
	Addr string `long:"addr" env:"ADDR" default:":8000" description:"server address"`

	StaticPath string `long:"static-path"`
}

//go:embed static/css/*.css
//go:embed static/postit.html
//go:embed static/js/*.js
//go:embed static/js/components/*.js

var FS embed.FS

func run() error {
	_, err := flags.Parse(&args)
	if err != nil {
		return errors.Wrap(err, "parse args")
	}

	r := gin.Default()

	dbPath := os.ExpandEnv("$HOME/postit.db")

	db, err := database.InitDB(dbPath)
	if err != nil {
		panic("failed to connect database")
	}

	s := &server{db: db}

	r.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(204)

	})

	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "postit.html")
	})

	if args.StaticPath != "" {
		r.Static("/static", args.StaticPath)
		r.StaticFile("postit.html", args.StaticPath+"/postit.html")
	} else {
		sub, err := fs.Sub(FS, "static")
		if err != nil {
			panic(err)
		}
		static := http.FS(sub)
		r.GET("/postit.html", func(c *gin.Context) {
			c.FileFromFS("postit.html", static)
		})
		r.StaticFS("/static", static)
	}

	r.POST("/twirp/kv.KVService/*Method", gin.WrapH(kv.NewKVServiceServer(s, nil)))
	proxy(r, "/couchdb", "http://127.0.0.1:5984")

	return r.Run(args.Addr)
}

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "%s\n", err.Error())
		os.Exit(1)
	}
}

func serveRevereProxy(target string, rootPath string, res http.ResponseWriter, req *http.Request) {
	dst, _ := url.Parse(target)
	req.URL.Path = strings.TrimPrefix(req.URL.Path, rootPath)

	const (
		username = "admin"      //TODO
		password = "mypassword" //TODO
	)

	auth := username + ":" + password
	encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", "Basic "+encodedAuth)

	proxy := httputil.NewSingleHostReverseProxy(dst)
	proxy.ServeHTTP(res, req)
}

func proxy(c *gin.Engine, path string, host string) {
	c.Any("/"+path+"/*any", func(c *gin.Context) {
		serveRevereProxy(host, path, c.Writer, c.Request)
	})
}
