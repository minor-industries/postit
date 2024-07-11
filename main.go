package main

import (
	"embed"
	"encoding/base64"
	"fmt"
	"github.com/BurntSushi/toml"
	"github.com/gin-gonic/gin"
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

type Config struct {
	Server struct {
		Addr       string `toml:"addr"`
		StaticPath string `toml:"static_path"`
	} `toml:"server"`

	CouchDB struct {
		Username string `toml:"username"`
		Password string `toml:"password"`
		Host     string `toml:"host"`
	} `toml:"couchdb"`
}

var config Config

//go:embed static/css/*.css
//go:embed static/*.html
//go:embed static/dist/bundle.js
//go:embed static/libs/*.js

var FS embed.FS

func run() error {
	configPath := os.ExpandEnv("$HOME/postit-config.toml")
	if _, err := toml.DecodeFile(configPath, &config); err != nil {
		return errors.Wrap(err, "decode toml config")
	}

	r := gin.Default()

	// Initialize the database
	dbPath := os.ExpandEnv("$HOME/postit.db")
	db, err := database.InitDB(dbPath)
	if err != nil {
		return errors.Wrap(err, "failed to connect database")
	}

	s := &server{db: db}

	// Setup routes
	r.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(204)
	})

	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "static/boards.html")
	})

	staticFS, err := fs.Sub(FS, "static")
	if err != nil {
		panic(errors.Wrap(err, "get static file system"))
	}
	static := http.FS(staticFS)

	if config.Server.StaticPath != "" {
		r.Static("/static", config.Server.StaticPath)
		r.StaticFile("bundle.js", config.Server.StaticPath+"/bundle.js")
	} else {
		r.GET("/bundle.js", func(c *gin.Context) {
			c.FileFromFS("bundle.js", static)
		})
		r.StaticFS("/static", static)
	}

	r.POST("/twirp/kv.KVService/*Method", gin.WrapH(kv.NewKVServiceServer(s, nil)))
	proxy(r, "/couchdb", config)

	return r.Run(config.Server.Addr)
}

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "%s\n", err.Error())
		os.Exit(1)
	}
}

func serveReverseProxy(config Config, rootPath string, res http.ResponseWriter, req *http.Request) {
	dst, _ := url.Parse(config.CouchDB.Host)
	req.URL.Path = strings.TrimPrefix(req.URL.Path, rootPath)

	auth := config.CouchDB.Username + ":" + config.CouchDB.Password
	encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", "Basic "+encodedAuth)

	proxy := httputil.NewSingleHostReverseProxy(dst)
	proxy.ModifyResponse = func(response *http.Response) error {
		return nil
	}
	proxy.ServeHTTP(res, req)
}

func proxy(c *gin.Engine, path string, config Config) {
	c.Any("/"+path+"/*any", func(c *gin.Context) {
		serveReverseProxy(config, path, c.Writer, c.Request)
	})
}
