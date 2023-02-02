package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/adgsm/co2-storage-rest-api/internal"
	"github.com/google/uuid"
	"github.com/lib/pq"

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
			"https://www.co2.storage",
			fmt.Sprintf("https://%s", config["api_host"])},
		AllowCredentials: true,
		AllowedMethods:   []string{"OPTION", "HEAD", "GET", "PUT", "POST", "DELETE"},
	})
	hndl := cr.Handler(v1)

	return hndl
}

func initRoutes(r *mux.Router) {
	// signup for access token
	r.HandleFunc("/signup", signup).Methods(http.MethodPost)

	// authenticate
	r.HandleFunc("/authenticate", authenticate).Methods(http.MethodGet)
	r.HandleFunc("/authenticate/{token}", authenticate).Methods(http.MethodGet)

	// seach for latest head record
	r.HandleFunc("/head", head).Methods(http.MethodGet)
	r.HandleFunc("/head?chain_name={chain_name}", head).Methods(http.MethodGet)

	// update head record
	r.HandleFunc("/update-head", updateHead).Methods(http.MethodPut)

	// get existing estuary key
	r.HandleFunc("/estuary-key", estuaryKey).Methods(http.MethodGet)
	r.HandleFunc("/estuary-key?account={account}&token={token}", estuaryKey).Methods(http.MethodGet)

	// add estuary key
	r.HandleFunc("/add-estuary-key", addEstuaryKey).Methods(http.MethodPost)

	// remove existing estuary key
	r.HandleFunc("/remove-estuary-key", removeEstuaryKey).Methods(http.MethodDelete)
	r.HandleFunc("/remove-estuary-key?account={account}&token={token}", removeEstuaryKey).Methods(http.MethodDelete)

	// search through scraped content
	r.HandleFunc("/search", search).Methods(http.MethodGet)
	r.HandleFunc("/search?phrases={phrases}&chain_name={chain_name}&data_structure={data_structure}&version={version}&cid={cid}&parent={parent}&name={name}&description={description}&base={base}&reference={reference}&content_cid={content_cid}&creator={creator}&created_from={created_from}&created_to={created_to}&offset={offset}&limit={limit}&sort_by={sort_by}&sort_dir={sort_dir}", search).Methods(http.MethodGet)

	// queue pin
	r.HandleFunc("/queue-pin", queuePin).Methods(http.MethodPost)

	// remove updated content
	r.HandleFunc("/remove-updated-content", removeUpdatedContent).Methods(http.MethodDelete)
	r.HandleFunc("/remove-updated-content?account={account}&cid={cid}", removeUpdatedContent).Methods(http.MethodDelete)

	// list available data chains
	r.HandleFunc("/list-data-chains", listDataChains).Methods(http.MethodGet)
	r.HandleFunc("/list-data-chains?offset={offset}&limit={limit}", listDataChains).Methods(http.MethodGet)

	// run bacalhau job
	r.HandleFunc("/run-bacalhau-job", runBacalhauJob).Methods(http.MethodPost)

	// check bacalhau job status
	r.HandleFunc("/bacalhau-job-status", bacalhauJobStatus).Methods(http.MethodGet)
	r.HandleFunc("/bacalhau-job-status?token={token}&account={account}&job={job}", bacalhauJobStatus).Methods(http.MethodGet)
}

func signup(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type SignupReq struct {
		Password string `json:"password"`
		Account  string `json:"account"`
		Refresh  bool   `json:"refresh"`
	}

	// Pick referrer address from the http request
	origin := r.Header.Get("Origin")

	// declare response type
	type SignupResp struct {
		Account  internal.NullString `json:"account"`
		SignedUp bool                `json:"signedup"`
		Token    internal.NullString `json:"token"`
		Validity time.Time           `json:"validity"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var signupReq SignupReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&signupReq)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// try to signup for an access token
	signupResult := db.QueryRow(context.Background(), "select * from co2_storage_api.signup($1, $2, $3, $4);",
		origin, signupReq.Password, signupReq.Account, signupReq.Refresh)

	var signupResp SignupResp
	if signupRespErr := signupResult.Scan(&signupResp.Account, &signupResp.SignedUp, &signupResp.Token, &signupResp.Validity); signupRespErr != nil {
		message := fmt.Sprintf("Error occured whilst generating access token (signup process) in a database. (%s)", signupRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	signupRespJson, errJson := json.Marshal(signupResp)
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

func _getTokenFromCookie(w http.ResponseWriter, r *http.Request) uuid.UUID {
	// declare auth cookie type
	type AuthCookie struct {
		Token    uuid.UUID `json:"token"`
		Validity time.Time `json:"validity"`
	}
	var authCookie AuthCookie

	// check for auth token in cookie
	internal.WriteLog("info", "Request without token provided. Checking for token in cookies.", "api")

	// read cookie
	cookie, cookieErr := r.Cookie(config["auth_cookie_name"])

	// report error if cookie is not existing
	if cookieErr != nil {
		internal.WriteLog("error", "Authentication cookie not found.", "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"message": "Authentication token not found."}`))
		return uuid.Nil
	}

	// read cookie value
	internal.WriteLog("info", fmt.Sprintf("Reading value %s for cookie %s.", cookie.Value, cookie.Name), "api")
	cookieValue, cookieValueErr := base64.StdEncoding.DecodeString(cookie.Value)

	// report error if we cannot read cookie value
	if cookieValueErr != nil {
		internal.WriteLog("error", "Authentication cookie is invalid.", "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"message": "Authentication token not found."}`))
		return uuid.Nil
	}

	// unmarshall cookie value
	unmarshalErr := json.Unmarshal(cookieValue, &authCookie)

	// report error if cookie value has wrong structure
	if unmarshalErr != nil {
		internal.WriteLog("error", "Authentication cookie value has wrong structure.", "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"message": "Authentication token not found."}`))
		return uuid.Nil
	}

	// return token
	return authCookie.Token
}

func _prepareTokenCookie(token uuid.UUID, validity time.Time,
	w http.ResponseWriter, deletion bool) http.Cookie {
	// declare auth cookie type
	type AuthCookie struct {
		Token    uuid.UUID `json:"token"`
		Validity time.Time `json:"validity"`
	}

	var authCookie AuthCookie

	authenticationCookieExpiration := time.Now().AddDate(1, 0, 0)
	age := 31622400

	// set cookie
	authCookie.Token = token
	authCookie.Validity = validity
	authCookieJson, authCookieJsonErr := json.Marshal(authCookie)
	if authCookieJsonErr != nil {
		message := fmt.Sprintf("Cannot marshal authentication cookie for token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return http.Cookie{
			Name:    config["auth_cookie_name"],
			Value:   "",
			Path:    "/",
			Expires: authenticationCookieExpiration,
			MaxAge:  -1, // delete cookie
		}
	}

	if deletion {
		age = -1
	}
	return http.Cookie{
		Name:    config["auth_cookie_name"],
		Value:   base64.StdEncoding.EncodeToString(authCookieJson),
		Path:    "/",
		Expires: authenticationCookieExpiration,
		MaxAge:  age,
	}
}

func authenticate(w http.ResponseWriter, r *http.Request) {
	// declare response type
	type AuthResp struct {
		Account       internal.NullString `json:"account"`
		Authenticated bool                `json:"authenticated"`
		Token         uuid.UUID           `json:"token"`
		Validity      time.Time           `json:"validity"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect path parameters
	pathParams := mux.Vars(r)

	// check for provided values
	token, provided := pathParams["token"]

	if !provided {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	internal.WriteLog("info", fmt.Sprintf("Trying to authenticate with token %s.", token), "api")

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	// try authenticating with the gathered token
	authenticateResult := db.QueryRow(context.Background(), "select * from co2_storage_api.authenticate($1);", uuidToken.String())

	// declare response
	var resp AuthResp

	// scan response for token and its validity time
	authenticateErr := authenticateResult.Scan(&resp.Account, &resp.Authenticated, &resp.Token, &resp.Validity)
	if authenticateErr != nil {
		message := fmt.Sprintf("Invalid authentication response for token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Token %s for user %s is authenticated? %t.", resp.Token, resp.Account.String, resp.Authenticated), "api")

	// Send error response if not authenticated
	if !resp.Authenticated {
		message := fmt.Sprintf("Invalid authentication token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	// send token and its validity
	authJson, errJson := json.Marshal(resp)
	if errJson != nil {
		message := fmt.Sprintf("Cannot marshal the database response for token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// set cookie
	authenticationCookie := _prepareTokenCookie(resp.Token, resp.Validity, w, false)

	// response writter
	http.SetCookie(w, &authenticationCookie)
	w.WriteHeader(http.StatusOK)
	w.Write(authJson)
}

func head(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Head      string    `json:"head"`
		Account   string    `json:"account"`
		Timestamp time.Time `json:"timestamp"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// search for latest heading CID
	var resp Record
	chainName := queryParams.Get("chain_name")
	if chainName == "" || chainName == "undefined" {
		chainName = "sandbox"
	}
	internal.WriteLog("info", fmt.Sprintf("Looking for head record in chain %s.", chainName), "api")

	sql := "select \"head\", \"account\", \"timestamp\" from co2_storage_api.chain where \"chain_name\" = $1 order by \"timestamp\" desc limit 1;"
	row := db.QueryRow(context.Background(), sql, chainName)

	// scan response
	rowErr := row.Scan(&resp.Head, &resp.Account, &resp.Timestamp)

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

func updateHead(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type UpdateHeadReq struct {
		ChainName string `json:"chain_name"`
		Head      string `json:"head"`
		NewHead   string `json:"new_head"`
		Account   string `json:"account"`
		Token     string `json:"token"`
	}

	// declare response type
	type UpdateHeadResp struct {
		Head    internal.NullString `json:"head"`
		Account internal.NullString `json:"account"`
		Updated bool                `json:"updated"`
		Ts      time.Time           `json:"timestamp"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var updateHeadReq UpdateHeadReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&updateHeadReq)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	internal.WriteLog("info", fmt.Sprintf("updateHeadReq.ChainName: %s, len(updateHeadReq.ChainName): %d.", updateHeadReq.ChainName, len(updateHeadReq.ChainName)), "api")

	// try to update head record
	updateHeadResult := db.QueryRow(context.Background(), "select * from co2_storage_api.update_head($1, $2, $3, $4, $5);",
		internal.SqlNullableString(updateHeadReq.ChainName), internal.SqlNullableString(updateHeadReq.Head), updateHeadReq.NewHead, updateHeadReq.Account, updateHeadReq.Token)

	var updateHeadResp UpdateHeadResp
	if updateHeadRespErr := updateHeadResult.Scan(&updateHeadResp.Head, &updateHeadResp.Account, &updateHeadResp.Updated, &updateHeadResp.Ts); updateHeadRespErr != nil {
		message := fmt.Sprintf("Error occured whilst updating head record in a database. (%s)", updateHeadRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	updateHeadRespJson, errJson := json.Marshal(updateHeadResp)
	if errJson != nil {
		message := "Cannot marshal the database response for generated new head record."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(updateHeadRespJson)
}

func estuaryKey(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Account   internal.NullString `json:"account"`
		Key       internal.NullString `json:"key"`
		Validity  internal.NullTime   `json:"validity"`
		Timestamp time.Time           `json:"timestamp"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided quesry parameters
	token := queryParams.Get("token")
	if token == "" {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	account := queryParams.Get("account")
	if account == "" {
		message := "Account is not provided."
		fmt.Print(message)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Trying to find Estuary key for account %s authenticated with token %s.", account, token), "api")

	// search a key
	row := db.QueryRow(context.Background(), "select * from co2_storage_api.estuary_key($1, $2::uuid);",
		account, uuidToken.String())

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Account, &resp.Key, &resp.Validity, &resp.Timestamp)

	if rowErr != nil {
		message := rowErr.Error()
		fmt.Print(message)
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

func addEstuaryKey(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type AddEstuaryKeyReq struct {
		Account  string `json:"account"`
		Key      string `json:"key"`
		Validity string `json:"validity"`
		Token    string `json:"token"`
	}

	// declare response type
	type AddEstuaryKeyResp struct {
		Account  internal.NullString `json:"account"`
		Key      internal.NullString `json:"key"`
		Validity internal.NullString `json:"validity"`
		Ts       time.Time           `json:"timestamp"`
		Added    bool                `json:"updated"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var addEstuaryKeyReq AddEstuaryKeyReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&addEstuaryKeyReq)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// try to add estuary key
	addEstuaryKeyResult := db.QueryRow(context.Background(), "select * from co2_storage_api.add_estuary_key($1, $2, $3::timestamptz, $4::uuid);",
		addEstuaryKeyReq.Account, addEstuaryKeyReq.Key, addEstuaryKeyReq.Validity, addEstuaryKeyReq.Token)

	var addEstuaryKeyResp AddEstuaryKeyResp
	if addEstuaryKeyRespErr := addEstuaryKeyResult.Scan(&addEstuaryKeyResp.Account, &addEstuaryKeyResp.Key, &addEstuaryKeyResp.Validity,
		&addEstuaryKeyResp.Ts, &addEstuaryKeyResp.Added); addEstuaryKeyRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding estuary key into a database. (%s)", addEstuaryKeyRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	addEstuaryKeyRespJson, errJson := json.Marshal(addEstuaryKeyResp)
	if errJson != nil {
		message := "Cannot marshal the database response for newly added estuary key."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(addEstuaryKeyRespJson)
}

func removeEstuaryKey(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Account internal.NullString `json:"account"`
		Removed internal.NullBool   `json:"removed"`
		Ts      time.Time           `json:"timestamp"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided quesry parameters
	token := queryParams.Get("token")
	if token == "" {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	account := queryParams.Get("account")
	if account == "" {
		message := "Account is not provided."
		fmt.Print(message)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Trying to remove Estuary key for account %s authenticated with token %s.", account, token), "api")

	// search a key
	row := db.QueryRow(context.Background(), "select * from co2_storage_api.remove_estuary_key($1, $2::uuid);",
		account, uuidToken.String())

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Account, &resp.Ts, &resp.Removed)

	if rowErr != nil {
		message := rowErr.Error()
		fmt.Print(message)
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

func search(w http.ResponseWriter, r *http.Request) {
	// declare response type
	type Resp struct {
		ChainName                  internal.NullString `json:"chain_name"`
		DataStructure              internal.NullString `json:"data_structure"`
		Version                    internal.NullString `json:"version"`
		ScrapeTime                 internal.NullTime   `json:"scrape_time"`
		Cid                        internal.NullString `json:"cid"`
		Parent                     internal.NullString `json:"parent"`
		Name                       internal.NullString `json:"name"`
		Description                internal.NullString `json:"description"`
		Base                       internal.NullString `json:"base"`
		Reference                  internal.NullString `json:"reference"`
		ContentCid                 internal.NullString `json:"content_cid"`
		Creator                    internal.NullString `json:"creator"`
		Timestamp                  internal.NullTime   `json:"timestamp"`
		Signature                  internal.NullString `json:"signature"`
		SignatureMethod            internal.NullString `json:"signature_method"`
		SignatureAccount           internal.NullString `json:"signature_account"`
		SignatureVerifyingContract internal.NullString `json:"signature_verifying_contract"`
		SignatureChainId           internal.NullString `json:"signature_chain_id"`
		SignatureCid               internal.NullString `json:"signature_cid"`
		SignatureV                 internal.NullInt32  `json:"signature_v"`
		SignatureR                 internal.NullString `json:"signature_r"`
		SignatureS                 internal.NullString `json:"signature_s"`
		References                 int64               `json:"references"`
		Uses                       int64               `json:"uses"`
		Total                      int64               `json:"total"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided search pherases
	phrases := queryParams.Get("phrases")

	internal.WriteLog("info", fmt.Sprintf("Search phrases %s.", phrases), "api")

	var phrasesList []string
	phrasesChunks := strings.Split(phrases, ",")
	if len(phrases) > 0 {
		for _, phrase := range phrasesChunks {
			phrase = strings.ToLower(strings.TrimSpace(phrase))
			phrasesList = append(phrasesList, phrase)
		}
	}

	// split phrases list into a sql array
	phrasesListSql := pq.Array(phrasesList)

	// get provided parameters
	chainName := queryParams.Get("chain_name")
	dataStructure := queryParams.Get("data_structure")
	version := queryParams.Get("version")
	cid := queryParams.Get("cid")
	parent := queryParams.Get("parent")
	name := queryParams.Get("name")
	description := queryParams.Get("description")
	base := queryParams.Get("base")
	reference := queryParams.Get("reference")
	contentCid := queryParams.Get("content_cid")
	creator := queryParams.Get("creator")
	createdFrom := queryParams.Get("created_from")
	createdTo := queryParams.Get("created_to")
	offset := queryParams.Get("offset")
	limit := queryParams.Get("limit")
	sortBy := queryParams.Get("sort_by")
	sortDir := queryParams.Get("sort_dir")

	// search through scraped content
	rows, rowsErr := db.Query(context.Background(), "select * from co2_storage_scraper.search_contents($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz, $14::timestamptz, $15, $16, $17, $18);",
		phrasesListSql, internal.SqlNullableString(chainName), internal.SqlNullableString(dataStructure), internal.SqlNullableString(version), internal.SqlNullableString(cid), internal.SqlNullableString(parent),
		internal.SqlNullableString(name), internal.SqlNullableString(description), internal.SqlNullableString(base), internal.SqlNullableString(reference), internal.SqlNullableString(contentCid),
		internal.SqlNullableString(creator), internal.SqlNullableString(createdFrom), internal.SqlNullableString(createdTo), internal.SqlNullableIntFromString(offset), internal.SqlNullableIntFromString(limit),
		internal.SqlNullableString(sortBy), internal.SqlNullableString(sortDir))

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "Error occured whilst searching through scraped content."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	defer rows.Close()

	// declare response
	respList := []Resp{}

	for rows.Next() {
		var resp Resp
		if respsErr := rows.Scan(&resp.ChainName, &resp.DataStructure, &resp.Version, &resp.ScrapeTime, &resp.Cid,
			&resp.Parent, &resp.Name, &resp.Description, &resp.Base, &resp.Reference, &resp.ContentCid,
			&resp.Creator, &resp.Timestamp, &resp.Signature, &resp.SignatureMethod, &resp.SignatureAccount,
			&resp.SignatureVerifyingContract, &resp.SignatureChainId, &resp.SignatureCid,
			&resp.SignatureV, &resp.SignatureR, &resp.SignatureS, &resp.References, &resp.Uses, &resp.Total); respsErr != nil {
			message := fmt.Sprintf("Error occured whilst scaning a scraped content response. (%s)", respsErr.Error())
			jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
			internal.WriteLog("error", message, "api")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(jsonMessage))
			return
		}
		respList = append(respList, resp)
	}

	// send response
	respListJson, errJson := json.Marshal(respList)
	if errJson != nil {
		message := "Cannot marshal scraped content response."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(respListJson)
}

func queuePin(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type QueuePinReq struct {
		Service string `json:"service"`
		Cid     string `json:"cid"`
		Name    string `json:"name"`
		Account string `json:"account"`
		Token   string `json:"token"`
	}

	// declare response type
	type QueuePinResp struct {
		Service string              `json:"service"`
		Cid     string              `json:"cid"`
		Name    internal.NullString `json:"name"`
		Ts      time.Time           `json:"timestamp"`
		Added   bool                `json:"added"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var queuePinReq QueuePinReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&queuePinReq)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// try to add pin to a pinning queue
	queuePinResult := db.QueryRow(context.Background(), "select * from co2_storage_api.queue_pin($1, $2, $3, $4, $5::uuid);",
		queuePinReq.Service, queuePinReq.Cid, queuePinReq.Name, queuePinReq.Account, queuePinReq.Token)

	var queuePinResp QueuePinResp
	if queuePinRespErr := queuePinResult.Scan(&queuePinResp.Service, &queuePinResp.Cid, &queuePinResp.Name,
		&queuePinResp.Ts, &queuePinResp.Added); queuePinRespErr != nil {
		message := fmt.Sprintf("Error occured whilst queueing a pin. (%s)", queuePinRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	queuePinRespJson, errJson := json.Marshal(queuePinResp)
	if errJson != nil {
		message := "Cannot marshal the database response for a queued pin."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(queuePinRespJson)
}

func removeUpdatedContent(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Cid     internal.NullString `json:"cid"`
		Removed internal.NullBool   `json:"removed"`
		Ts      time.Time           `json:"timestamp"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided quesry parameters
	token := queryParams.Get("token")
	if token == "" {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	account := queryParams.Get("account")
	if account == "" {
		message := "Account is not provided."
		fmt.Print(message)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	cid := queryParams.Get("cid")
	if cid == "" {
		message := "CID is not provided."
		fmt.Print(message)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Trying to remove updated CID content %s, holded by account %s authenticated with token %s.", cid, account, token), "api")

	// search a key
	row := db.QueryRow(context.Background(), "select * from co2_storage_api.remove_updated_content($1, $2, $3::uuid);",
		cid, account, uuidToken.String())

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Cid, &resp.Ts, &resp.Removed)

	if rowErr != nil {
		message := rowErr.Error()
		fmt.Print(message)
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

func listDataChains(w http.ResponseWriter, r *http.Request) {
	// declare response type
	type Resp struct {
		ChainName internal.NullString `json:"chain_name"`
		Total     int64               `json:"total"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	offset := queryParams.Get("offset")
	limit := queryParams.Get("limit")

	// search through scraped content
	rows, rowsErr := db.Query(context.Background(), "select * from co2_storage_scraper.list_data_chains($1, $2);",
		internal.SqlNullableIntFromString(offset), internal.SqlNullableIntFromString(limit))

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "Error occured whilst listing data chains."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	defer rows.Close()

	// declare response
	respList := []Resp{}

	for rows.Next() {
		var resp Resp
		if respsErr := rows.Scan(&resp.ChainName, &resp.Total); respsErr != nil {
			message := fmt.Sprintf("Error occured whilst parsing data chains response. (%s)", respsErr.Error())
			jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
			internal.WriteLog("error", message, "api")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(jsonMessage))
			return
		}
		respList = append(respList, resp)
	}

	// send response
	respListJson, errJson := json.Marshal(respList)
	if errJson != nil {
		message := "Cannot marshal data chians list."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(respListJson)
}

func runBacalhauJob(w http.ResponseWriter, r *http.Request) {
	// declare auth response type
	type AuthResp struct {
		Account       internal.NullString `json:"account"`
		Authenticated bool                `json:"authenticated"`
		Token         uuid.UUID           `json:"token"`
		Validity      time.Time           `json:"validity"`
	}

	// declare request type
	type Req struct {
		Token      string   `json:"token"`
		Type       string   `json:"type"`
		Parameters string   `json:"parameters"`
		Inputs     []string `json:"inputs"`
		Container  string   `json:"container"`
		Commands   string   `json:"commands"`
		Swarm      []string `json:"swarm"`
	}

	// declare response type
	type Resp struct {
		JobUuid string `json:"job_uuid"`
	}

	// declare add job response type
	type AddJobResp struct {
		Account string             `json:"account"`
		Job     string             `json:"job"`
		Id      internal.NullInt32 `json:"id"`
	}

	// declare job ended response type
	type JobEndedResp struct {
		Id    int32 `json:"id"`
		Ended bool
	}

	// declare job uuid / cid response type
	type JobUuidCidResp struct {
		Id      int32 `json:"id"`
		Success bool
	}

	var resp Resp
	var req Req

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&req)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// check for provided quesry parameters
	token := req.Token
	if token == "" {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	// try authenticating with the gathered token
	authenticateResult := db.QueryRow(context.Background(), "select * from co2_storage_api.authenticate($1);", uuidToken.String())

	var authResp AuthResp

	// scan response for token and its validity time
	authenticateErr := authenticateResult.Scan(&authResp.Account, &authResp.Authenticated, &authResp.Token, &authResp.Validity)
	if authenticateErr != nil {
		message := fmt.Sprintf("Invalid authentication response for token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Token %s for user %s is authenticated? %t.", authResp.Token, authResp.Account.String, authResp.Authenticated), "api")

	// Send error response if not authenticated
	if !authResp.Authenticated {
		message := fmt.Sprintf("Invalid authentication token %s.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	job := req.Type
	inputs := req.Inputs
	rp := strings.NewReplacer(" ", "", ";", "")

	jobContainer := req.Container
	commands := req.Commands
	jobParameters := req.Parameters
	swarm := req.Swarm

	for i, arg := range inputs {
		inputs[i] = rp.Replace(arg)
	}
	inputsStr := strings.Join(inputs, ",")

	for i, arg := range swarm {
		swarm[i] = rp.Replace(arg)
	}
	swarmStr := strings.Join(swarm, ",")

	for _, arg := range inputs {
		internal.WriteLog("info", fmt.Sprintf("arg %s", arg), "bacalhau-cli-wrapper")
	}

	// add a job
	addJobResult := db.QueryRow(context.Background(), "select * from co2_storage_api.add_job($1, $2::uuid, $3);",
		authResp.Account.String, uuidToken.String(), job)

	var addJobResp AddJobResp
	if addJobRespErr := addJobResult.Scan(&addJobResp.Account, &addJobResp.Job, &addJobResp.Id); addJobRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding a job. (%s)", addJobRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	jobUuidChan := make(chan string)
	go _runCliBacalhauJob(job, jobParameters, inputsStr, jobContainer, commands, swarmStr,
		addJobResp.Account, uuidToken.String(), addJobResp.Id.Int32, jobUuidChan)
	resp.JobUuid = <-jobUuidChan
	if resp.JobUuid == "" {
		// job ended
		jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
			authResp.Account.String, uuidToken.String(), addJobResp.Id)

		var jobEndedResp JobEndedResp
		if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
			message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
			jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
			internal.WriteLog("error", message, "api")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(jsonMessage))
			return
		}

		message := fmt.Sprintf("Error occured whilst runing Bacalhau job %s.", job)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// job uuid
	jobUuidResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_uuid($1, $2::uuid, $3, $4::uuid);",
		authResp.Account.String, uuidToken.String(), addJobResp.Id, resp.JobUuid)

	var jobUuidResp JobUuidCidResp
	if jobUuidRespErr := jobUuidResult.Scan(&jobUuidResp.Id, &jobUuidResp.Success); jobUuidRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding info about job UUID. (%s)", jobUuidRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	respListJson, errJson := json.Marshal(resp)
	if errJson != nil {
		message := "Cannot marshal bacalhau job response."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(respListJson)
}

func _runCliBacalhauJob(job string, parameters string, inputs string, container string, commands string, swarm string,
	account string, token string, id int32, jobUuidChan chan string) {

	// declare job started response type
	type JobStartedResp struct {
		Id      int32 `json:"id"`
		Started bool
	}

	// declare job ended response type
	type JobEndedResp struct {
		Id    int32 `json:"id"`
		Ended bool
	}

	// declare job uuid / cid response type
	type JobUuidCidResp struct {
		Id      int32 `json:"id"`
		Success bool
	}

	if swarm == "" {
		swarm = config["bacalhau_swarm"]
	}

	var cmd *exec.Cmd
	var stdoutBuf, stderrBuf bytes.Buffer

	switch job {
	case "url-data":
	case "url-dataset":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run %s --id-only --wait=false --ipfs-swarm-addrs=%s --input-urls=%s %s", parameters, swarm, inputs, container))
	case "custom-docker-job-without-inputs":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run %s --id-only --wait=false --ipfs-swarm-addrs=%s %s -- %s", parameters, swarm, container, commands))
	case "custom-docker-job-with-url-inputs":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run %s --id-only --wait=false --ipfs-swarm-addrs=%s --input-urls=%s %s -- %s", parameters, swarm, inputs, container, commands))
	case "custom-docker-job-with-cid-inputs":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run %s --id-only --wait=false --ipfs-swarm-addrs=%s --inputs=%s %s -- %s", parameters, swarm, inputs, container, commands))
	default:
		message := fmt.Sprintf("Unknown job type %s", job)
		internal.WriteLog("error", message, "api")
		jobUuidChan <- ""
		return
	}

	cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	// job started
	jobStartedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_started($1, $2::uuid, $3);",
		account, token, id)

	var jobStartedResp JobStartedResp
	if jobStartedRespErr := jobStartedResult.Scan(&jobStartedResp.Id, &jobStartedResp.Started); jobStartedRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding info about started job. (%s)", jobStartedRespErr.Error())
		internal.WriteLog("error", message, "api")
	}

	err := cmd.Run()
	if err != nil {
		// job ended
		jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
			account, token, id)

		var jobEndedResp JobEndedResp
		if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
			message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
			internal.WriteLog("error", message, "api")
		}

		message := fmt.Sprintf("cmd.Run() failed with %s", err)
		internal.WriteLog("error", message, "api")
		jobUuidChan <- ""
	}
	defer cmd.Process.Kill()

	outStr, errStr := strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
	internal.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStr, errStr), "bacalhau-cli-wrapper")

	if errStr != "" {
		// job ended
		jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
			account, token, id)

		var jobEndedResp JobEndedResp
		if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
			message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
			internal.WriteLog("error", message, "api")
		}

		message := fmt.Sprintf("Bacalhau job failed with %s", errStr)
		internal.WriteLog("error", message, "api")
		jobUuidChan <- ""
	}

	jobUuidChan <- outStr

	var outStrL string
	var errStrL string
	checkJobStatusEvery, checkJobStatusEveryErr := strconv.Atoi(config["check_job_status_every"])
	if checkJobStatusEveryErr != nil {
		checkJobStatusEvery = 5
	}
	sleepTime := time.Duration(checkJobStatusEvery) * time.Second

	maxLaps, maxLapsErr := strconv.Atoi(config["check_job_status_max_laps"])
	if maxLapsErr != nil {
		maxLaps = 17280 // one day if we check every 5 sec
	}
	laps := 0

	for outStrL == "" && errStrL == "" && laps < maxLaps {
		time.Sleep(sleepTime)

		stdoutBuf.Reset()
		stderrBuf.Reset()

		stateCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\" | select(.State==(\"Completed\", \"Error\")) | .State'", outStr)
		internal.WriteLog("info", fmt.Sprintf("Bacalhau state cmd: %s", stateCmd), "bacalhau-cli-wrapper")
		cmd = exec.Command("sh", "-c", stateCmd)
		cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
		cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)
		err = cmd.Run()
		if err != nil {
			// job ended
			jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
				account, token, id)

			var jobEndedResp JobEndedResp
			if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
				message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
				internal.WriteLog("error", message, "api")
			}
			return
		}
		outStrL, errStrL = strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
		internal.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStrL, errStrL), "bacalhau-cli-wrapper")

		if errStrL != "" {
			// job ended
			jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
				account, token, id)

			var jobEndedResp JobEndedResp
			if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
				message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
				internal.WriteLog("error", message, "api")
			}
			return
		}

		if outStrL == "Error" {
			stdoutBuf.Reset()
			stderrBuf.Reset()

			errorStatusCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\" | select(.State==(\"Error\")) | .Status'", outStr)
			internal.WriteLog("info", fmt.Sprintf("Bacalhau status cmd: %s", errorStatusCmd), "bacalhau-cli-wrapper")
			cmd = exec.Command("sh", "-c", errorStatusCmd)
			cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
			cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)
			err = cmd.Run()
			if err != nil {
				// job ended
				jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
					account, token, id)

				var jobEndedResp JobEndedResp
				if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
					message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
					internal.WriteLog("error", message, "api")
				}
				return
			}
			outStrL, errStrL = strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
			internal.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStrL, errStrL), "bacalhau-cli-wrapper")

			// write "Error" into job cid field
			jobCidResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_cid($1, $2::uuid, $3, $4, $5);",
				account, token, id, "Error", outStrL)

			var jobCidResp JobUuidCidResp
			if jobCidRespErr := jobCidResult.Scan(&jobCidResp.Id, &jobCidResp.Success); jobCidRespErr != nil {
				message := fmt.Sprintf("Error occured whilst adding info about job CID. (%s)", jobCidRespErr.Error())
				internal.WriteLog("error", message, "api")
			}

			// job ended
			jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
				account, token, id)

			var jobEndedResp JobEndedResp
			if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
				message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
				internal.WriteLog("error", message, "api")
			}
			return
		}

		laps++
	}

	stdoutBuf.Reset()
	stderrBuf.Reset()
	//		successCmd := fmt.Sprintf("bacalhau list --id-filter=%s --output=json | jq -r '.[0].Status.JobState.Nodes[] | .Shards.\"0\".PublishedResults | select(.CID) | .CID'", outStr)
	successCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\".PublishedResults | select(.CID) | .CID'", outStr)
	internal.WriteLog("info", fmt.Sprintf("Bacalhau retrive job CID cmd: %s", successCmd), "bacalhau-cli-wrapper")
	cmd = exec.Command("sh", "-c", successCmd)
	cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)
	err = cmd.Run()
	if err != nil {
		// job ended
		jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
			account, token, id)

		var jobEndedResp JobEndedResp
		if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
			message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
			internal.WriteLog("error", message, "api")
		}
		return
	}
	outStrL, errStrL = strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
	internal.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStrL, errStrL), "bacalhau-cli-wrapper")

	if errStrL != "" {
		// job ended
		jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
			account, token, id)

		var jobEndedResp JobEndedResp
		if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
			message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
			internal.WriteLog("error", message, "api")
		}
		return
	}

	// job cid
	jobCidResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_cid($1, $2::uuid, $3, $4, $5);",
		account, token, id, outStrL, "")

	var jobCidResp JobUuidCidResp
	if jobCidRespErr := jobCidResult.Scan(&jobCidResp.Id, &jobCidResp.Success); jobCidRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding info about job CID. (%s)", jobCidRespErr.Error())
		internal.WriteLog("error", message, "api")
	}

	// job ended
	jobEndedResult := db.QueryRow(context.Background(), "select * from co2_storage_api.job_ended($1, $2::uuid, $3);",
		account, token, id)

	var jobEndedResp JobEndedResp
	if jobEndedRespErr := jobEndedResult.Scan(&jobEndedResp.Id, &jobEndedResp.Ended); jobEndedRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding info about ended job. (%s)", jobEndedRespErr.Error())
		internal.WriteLog("error", message, "api")
	}

	// try to add pin to a pinning queue
	// declare queue pin response type
	type QueuePinResp struct {
		Service string              `json:"service"`
		Cid     string              `json:"cid"`
		Name    internal.NullString `json:"name"`
		Ts      time.Time           `json:"timestamp"`
		Added   bool                `json:"added"`
	}

	queuePinResult := db.QueryRow(context.Background(), "select * from co2_storage_api.queue_pin($1, $2, $3, $4, $5::uuid);",
		"filecoin-green", outStrL, fmt.Sprintf("Bacalhau job Id: %s", outStr), account, token)

	var queuePinResp QueuePinResp
	if queuePinRespErr := queuePinResult.Scan(&queuePinResp.Service, &queuePinResp.Cid, &queuePinResp.Name,
		&queuePinResp.Ts, &queuePinResp.Added); queuePinRespErr != nil {
		message := fmt.Sprintf("Error occured whilst queueing a pin. (%s)", queuePinRespErr.Error())
		internal.WriteLog("error", message, "api")
	}
}

func bacalhauJobStatus(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Job     string              `json:"job"`
		Cid     internal.NullString `json:"cid"`
		Message internal.NullString `json:"message"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided quesry parameters
	token := queryParams.Get("token")
	if token == "" {
		// check for token in cookies
		tokenUUID := _getTokenFromCookie(w, r)

		if tokenUUID == uuid.Nil {
			return
		}

		token = tokenUUID.String()
	}

	// check if token is valid uuid
	uuidToken, uuidErr := uuid.Parse(token)
	if uuidErr != nil {
		message := fmt.Sprintf("Authentication token %s is invalid UUID.", token)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	account := queryParams.Get("account")
	if account == "" {
		message := "Account is not provided."
		fmt.Print(message)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	// check if supplied job has a valid uuid structure
	job := queryParams.Get("job")
	_, uuidJobErr := uuid.Parse(job)
	if uuidJobErr != nil {
		message := fmt.Sprintf("Provided job UUID %s is invalid UUID.", job)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Trying to obtain status of the Bacalhau job %s run by account %s authenticated with token %s.", job, account, token), "api")

	// search a key
	row := db.QueryRow(context.Background(), "select * from co2_storage_api.job_status($1, $2::uuid, $3::uuid);",
		account, uuidToken.String(), job)

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Job, &resp.Cid, &resp.Message)

	if rowErr != nil {
		message := rowErr.Error()
		fmt.Print(message)
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
