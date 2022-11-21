package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/adgsm/co2-storage-rest-api/internal"

	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"github.com/jackc/pgx/v4/pgxpool"
)

// declare global vars
type Api struct {
	Router *mux.Router
}

var config internal.Config
var rcerr error
var confsPath = "configs/configs"
var db *pgxpool.Pool

func New(dtb *pgxpool.Pool) http.Handler {
	// read configs
	config, rcerr = internal.ReadConfigs(confsPath)
	if rcerr != nil {
		panic(rcerr)
	}

	// set db pointer
	db = dtb

	// set api struct
	a := &Api{
		Router: mux.NewRouter(),
	}
	a.Router.Host(config["api_host"])

	// set api v1 subroute
	v1 := a.Router.PathPrefix("/co2-storage/api/v1").Subrouter()

	// inti routes
	initRoutes(v1)

	// allow cros-origine requests
	cr := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3002", "https://localhost:3002",
			"https://co2.storage",
			"https://sandbox.co2.storage",
			fmt.Sprintf("https://%s", config["api_host"])},
		AllowCredentials: true,
	})
	hndl := cr.Handler(v1)

	return hndl
}

func initRoutes(r *mux.Router) {
	// search peer ids on provided miner ids
	r.HandleFunc("/head", head).Methods(http.MethodGet)
}

func head(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Id        int
		Head      string
		Account   string
		Timestamp time.Time
		Scraped   bool
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// search for latest heading CID
	row := db.QueryRow(context.Background(), "select \"id\", \"head\", \"account\", \"timestamp\", \"scraped\" from co2_storage_api.chain order by \"id\" desc limit 1;")

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Id, &resp.Head, &resp.Account, &resp.Timestamp, &resp.Scraped)

	if rowErr != nil {
		fmt.Print(rowErr.Error())
		message := "No head records exist."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	respJson, errJson := json.Marshal(resp)
	if errJson != nil {
		message := "Cannot marshal the database response."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(respJson)
}
