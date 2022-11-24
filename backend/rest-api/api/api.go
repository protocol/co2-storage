package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/adgsm/co2-storage-rest-api/internal"
	"github.com/google/uuid"

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
	// signup for access token
	r.HandleFunc("/signup", signup).Methods(http.MethodPost)

	// authenticate
	r.HandleFunc("/authenticate", authenticate).Methods(http.MethodGet)
	r.HandleFunc("/authenticate/{token}", authenticate).Methods(http.MethodGet)

	// seach for latest head record
	r.HandleFunc("/head", head).Methods(http.MethodGet)

	// update head record
	r.HandleFunc("/update-head", updateHead).Methods(http.MethodPost)
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
		Account  internal.NullString
		Token    internal.NullString
		Validity time.Time
		SignedUp bool
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
		Account       internal.NullString
		Authenticated bool
		Token         uuid.UUID
		Validity      time.Time
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

	internal.WriteLog("info", fmt.Sprintf("Token %s for user %d is authenticated? %t.", resp.Token, resp.Account, resp.Authenticated), "api")

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

func updateHead(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type UpdateHeadReq struct {
		Head    string `json:"head"`
		NewHead string `json:"new_head"`
		Account string `json:"account"`
		Token   string `json:"token"`
	}

	// declare response type
	type UpdateHeadResp struct {
		Head    internal.NullString
		Account internal.NullString
		Updated bool
		Ts      time.Time
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var updateHeadReq UpdateHeadReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&updateHeadReq)

	if decoderErr != nil {
		message := fmt.Sprintf("Decoding %s as JSON failed.", r.Body)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}
	defer r.Body.Close()

	// try to update head record
	updateHeadResult := db.QueryRow(context.Background(), "select * from co2_storage_api.update_head($1, $2, $3, $4);",
		updateHeadReq.Head, updateHeadReq.NewHead, updateHeadReq.Account, updateHeadReq.Token)

	var updateHeadResp UpdateHeadResp
	if updateHeadRespErr := updateHeadResult.Scan(&updateHeadResp.Head, &updateHeadResp.Account, &updateHeadResp.Updated, &updateHeadResp.Ts); updateHeadRespErr != nil {
		message := fmt.Sprintf("Error occured whilst updating head record in a database. (%s)", updateHeadRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	updateHeadRespArr := []UpdateHeadResp{}
	updateHeadRespArr = append(updateHeadRespArr, updateHeadResp) // TODO: Investigate about following. If not within the array NullString/Int32,... are not performing well.

	// send response
	// updateHeadRespJson, errJson := json.Marshal(updateHeadResp)
	updateHeadRespJson, errJson := json.Marshal(updateHeadRespArr)
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
