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
	// seach for latest head record
	r.HandleFunc("/head", head).Methods(http.MethodGet)

	// signup for access token
	r.HandleFunc("/signup", signup).Methods(http.MethodPost)
	r.HandleFunc("/signup?password={password}&account={account}&refresh={refresh}", signup).Methods(http.MethodPost)

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

func signup(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type SignupReq struct {
		Password string `json:"password"`
		Account  string `json:"account"`
		Refresh  bool   `json:"refresh"`
	}

	// declare response type
	type SignupResp struct {
		Account       internal.NullString
		Token         internal.NullString
		TokenValidity time.Time
		SignedUp      bool
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var signupReq SignupReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&signupReq)

	if decoderErr != nil {
		message := fmt.Sprintf("Decoding %s as JSON failed.", r.Body)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// check for provided values
	password := signupReq.Password
	account := signupReq.Account
	refresh := signupReq.Refresh

	// try to signup for an access token
	signupResult := db.QueryRow(context.Background(), "select * from co2_storage_api.signup($1, $2, $3);",
		password, account, refresh)

	var signupResp SignupResp
	if signupRespErr := signupResult.Scan(&signupResp.Account, &signupResp.SignedUp, &signupResp.Token, &signupResp.TokenValidity); signupRespErr != nil {
		message := fmt.Sprintf("Error occured whilst generating access token (signup process) in a database. (%s)", signupRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	signupRespArr := []SignupResp{}
	signupRespArr = append(signupRespArr, signupResp) // TODO: Investigate about following. If not within the array NullString/Int32,... are not performing well.

	// send response
	// signupRespJson, errJson := json.Marshal(signupResp)
	signupRespJson, errJson := json.Marshal(signupRespArr)
	if errJson != nil {
		message := "Cannot marshal the database response for generating access token (signup process)."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(signupRespJson)
}
