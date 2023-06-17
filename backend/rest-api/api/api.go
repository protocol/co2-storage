package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/adgsm/co2-storage-rest-api/internal"
	"github.com/chenzhijie/go-web3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	shell "github.com/ipfs/go-ipfs-http-client"
	ipldCbor "github.com/ipfs/go-ipld-cbor"
	files "github.com/ipfs/go-libipfs/files"
	"github.com/ipfs/interface-go-ipfs-core/options"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/lib/pq"
	"github.com/multiformats/go-multiaddr"
	mh "github.com/multiformats/go-multihash"
	"github.com/rs/cors"
)

// declare global vars
type Api struct {
	Router *mux.Router
}

var config internal.Config
var rcerr error
var confsPath = "configs/configs"
var db *pgxpool.Pool
var rpcProvider string
var verifyingSignatureContractABI string
var verifyingSignatureContractAddress string
var sh *shell.HttpApi
var shErr error

const HandshakeTimeoutSecs = 10

type UploadHeader struct {
	Filename string
	Size     int
}
type UploadStatus struct {
	Code     int      `json:"code,omitempty"`
	Status   string   `json:"status,omitempty"`
	Progress *float64 `json:"progress,omitempty"`
	Filename *string  `json:"filename,omitempty"`
	Cid      *string  `json:"cid,omitempty"`
	filename string
	progress float64
	cid      string
}
type wsConn struct {
	conn *websocket.Conn
}

func New(dtb *pgxpool.Pool, rpcProviderUrl string) http.Handler {
	// read configs
	config, rcerr = internal.ReadConfigs(confsPath)
	if rcerr != nil {
		panic(rcerr)
	}

	// set db pointer
	db = dtb

	// set RPC provider URL, contracts, etc
	rpcProvider = rpcProviderUrl

	sh, shErr = _initShell(config)
	if shErr != nil {
		panic(shErr)
	}

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
		//		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{
			http.MethodHead,
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
		},
		AllowedHeaders:         []string{"*"},
		AllowCredentials:       false,
		AllowOriginRequestFunc: allowAllOrigins,
	})
	hndl := cr.Handler(v1)

	return hndl
}

func allowAllOrigins(r *http.Request, origin string) bool {
	return true
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
	r.HandleFunc("/search?phrases={phrases}&chain_name={chain_name}&data_structure={data_structure}&version={version}&cid={cid}&parent={parent}&name={name}&description={description}&base={base}&reference={reference}&content_cid={content_cid}&creator={creator}&created_from={created_from}&created_to={created_to}&protocol={protocol}&license={license}&offset={offset}&limit={limit}&sort_by={sort_by}&sort_dir={sort_dir}", search).Methods(http.MethodGet)

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

	// create DAG structure on connected IPFS node
	r.HandleFunc("/add-cbor-dag", addCborDag).Methods(http.MethodPost)

	// upload and add file on connected IPFS node
	r.HandleFunc("/add-file", addFile).Methods(http.MethodGet)

	// update profile name
	r.HandleFunc("/update-profile-name", updateProfileName).Methods(http.MethodPut)

	// update profile default data license
	r.HandleFunc("/update-profile-default-data-license", updateProfileDefaultDataLicense).Methods(http.MethodPut)

	// get total size of assets stored in the account
	r.HandleFunc("/account-data-size", accountDataSize).Methods(http.MethodGet)
	r.HandleFunc("/account-data-size?account={account}&token={token}", accountDataSize).Methods(http.MethodGet)

	// add function
	r.HandleFunc("/add-function", addFunction).Methods(http.MethodPost)

	// search functions
	r.HandleFunc("/search-functions", searchFunctions).Methods(http.MethodGet)
	r.HandleFunc("/search-functions?phrases={phrases}&name={name}&description={description}&function_type={function_type}&function_container={function_container}&input_type={input_type}&output_type={output_type}&retired={retired}&creator={creator}&created_from={created_from}&created_to={created_to}&offset={offset}&limit={limit}&sort_by={sort_by}&sort_dir={sort_dir}", searchFunctions).Methods(http.MethodGet)
}

func signup(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type SignupReq struct {
		Account           string `json:"account"`
		ChainId           int    `json:"chainId"`
		Cid               string `json:"cid"`
		Message           string `json:"message"`
		Method            string `json:"method"`
		Signature         string `json:"signature"`
		R                 string `json:"r"`
		S                 string `json:"s"`
		V                 int    `json:"v"`
		VerifyingContract string `json:"verifyingContract"`
		Refresh           bool   `json:"refresh"`
	}

	// declare response type
	type SignupResp struct {
		Account  internal.NullString `json:"account"`
		SignedUp bool                `json:"signedup"`
		Token    internal.NullString `json:"token"`
		Validity time.Time           `json:"validity"`
	}

	verifyingSignatureContractABI = config["verifying_message_signature_contract_abi"]
	verifyingSignatureContractAddress = config["verifying_message_signature_contract_address"]

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var signupReq SignupReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&signupReq)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed. (%s)", string(b), decoderErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("info", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	if signupReq.Message == "" {
		internal.WriteLog("warn", "Provided request is not containing a message (but probably a CID). Please use @co2-storage/js-api v1.2.1 or higher.", "api")

		signupReq.Message = signupReq.Cid
		verifyingSignatureContractABI = config["verifying_cid_signature_contract_abi"]
		verifyingSignatureContractAddress = config["verifying_cid_signature_contract_address"]
	}

	defer r.Body.Close()

	web3, web3ERrr := web3.NewWeb3(rpcProvider)
	if web3ERrr != nil {
		message := fmt.Sprintf("Can not connect to RPC provider %s. (%s)", rpcProvider, web3ERrr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	web3.Eth.SetChainId(1)
	web3Contract, web3ContractERrr := web3.Eth.NewContract(verifyingSignatureContractABI, verifyingSignatureContractAddress)
	if web3ContractERrr != nil {
		message := fmt.Sprintf("Can not attach to the contract %s. (%s)", verifyingSignatureContractAddress, web3ContractERrr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	var web3ContractCallParams []interface{}
	addr, addrErr := common.NewMixedcaseAddressFromString(signupReq.Account)
	if addrErr != nil {
		message := fmt.Sprintf("Can not create address from %s. (%s)", signupReq.Account, addrErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	bR := [32]byte{}
	bRh, bRhErr := hex.DecodeString(signupReq.R[2:])
	if bRhErr != nil {
		message := fmt.Sprintf("Can not decode string %s to hex. (%s)", signupReq.R[2:], bRhErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}
	copy(bR[:], bRh)

	bS := [32]byte{}
	bSh, bShErr := hex.DecodeString(signupReq.S[2:])
	if bShErr != nil {
		message := fmt.Sprintf("Can not decode string %s to hex. (%s)", signupReq.S[2:], bShErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}
	copy(bS[:], bSh)

	web3ContractCallParams = append(web3ContractCallParams, addr.Address(), signupReq.Message, uint8(signupReq.V), bR, bS)

	message := fmt.Sprintf("Account: %s, Message/Cid: %s, V: %d, R: %s, S: %s",
		addr.Address().String(), signupReq.Message, signupReq.V, signupReq.R, signupReq.S)
	internal.WriteLog("info", message, "api")

	web3ContractCall, web3ContractCallERrr := web3Contract.Call("verifySignature", web3ContractCallParams...)
	if web3ContractCallERrr != nil {
		message := fmt.Sprintf("Can not verify signature. (%s)", web3ContractCallERrr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	if _, ok := web3ContractCall.(bool); !ok {
		message := fmt.Sprintf("Verifying response is not a boolean. (%v)", web3ContractCall)
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	verified := web3ContractCall.(bool)

	if !verified {
		message := "Signature verification failed"
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	// try to signup for an access token
	signupResult := db.QueryRow(context.Background(), "select * from co2_storage_api.signup($1, $2);",
		signupReq.Account, signupReq.Refresh)

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

func _initShell(config internal.Config) (*shell.HttpApi, error) {
	ipfsNode := config["ipfs_node_addr"]
	multiAddr, multiAddrErr := multiaddr.NewMultiaddr(ipfsNode)
	if multiAddrErr != nil {
		message := fmt.Sprintf("%s is not valid multiaddr.", ipfsNode)
		internal.WriteLog("error", message, "rest-api")
		return nil, errors.New(message)
	}
	sh, shErr := shell.NewApi(multiAddr)
	if shErr != nil {
		message := fmt.Sprintf("Can not initiate new IPFS client api. (%s)", shErr.Error())
		internal.WriteLog("error", message, "rest-api")
		return nil, errors.New(message)
	}

	localAddrs, localAddrsErr := sh.Swarm().LocalAddrs(context.Background())
	if localAddrsErr != nil {
		message := fmt.Sprintf("Can not obtain IPFS localaddresses. (%s)", localAddrsErr.Error())
		internal.WriteLog("error", message, "rest-api")
		return nil, errors.New(message)
	}
	for _, addr := range localAddrs {
		message := fmt.Sprintf("Listening at %s.", addr.String())
		internal.WriteLog("info", message, "rest-api")
	}

	return sh, nil
}

func authenticate(w http.ResponseWriter, r *http.Request) {
	// declare response type
	type AuthResp struct {
		Account            internal.NullString `json:"account"`
		Name               internal.NullString `json:"name"`
		DefaultDataLicense internal.NullString `json:"default_data_license"`
		Authenticated      bool                `json:"authenticated"`
		Token              uuid.UUID           `json:"token"`
		Validity           time.Time           `json:"validity"`
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
	authenticateErr := authenticateResult.Scan(&resp.Account, &resp.Name, &resp.DefaultDataLicense, &resp.Authenticated, &resp.Token, &resp.Validity)
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
		Protocol                   internal.NullString `json:"protocol"`
		License                    internal.NullString `json:"license"`
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
		Size                       internal.NullInt64  `json:"size"`
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
	protocol := queryParams.Get("protocol")
	license := queryParams.Get("license")
	createdFrom := queryParams.Get("created_from")
	createdTo := queryParams.Get("created_to")
	offset := queryParams.Get("offset")
	limit := queryParams.Get("limit")
	sortBy := queryParams.Get("sort_by")
	sortDir := queryParams.Get("sort_dir")

	// search through scraped content
	rows, rowsErr := db.Query(context.Background(), "select * from co2_storage_scraper.search_contents($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz, $14::timestamptz, $15, $16, $17, $18, $19, $20);",
		phrasesListSql, internal.SqlNullableString(chainName), internal.SqlNullableString(dataStructure), internal.SqlNullableString(version), internal.SqlNullableString(cid), internal.SqlNullableString(parent),
		internal.SqlNullableString(name), internal.SqlNullableString(description), internal.SqlNullableString(base), internal.SqlNullableString(reference), internal.SqlNullableString(contentCid),
		internal.SqlNullableString(creator), internal.SqlNullableString(createdFrom), internal.SqlNullableString(createdTo), internal.SqlNullableString(protocol), internal.SqlNullableString(license),
		internal.SqlNullableIntFromString(offset), internal.SqlNullableIntFromString(limit), internal.SqlNullableString(sortBy), internal.SqlNullableString(sortDir))

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
			&resp.Creator, &resp.Protocol, &resp.License, &resp.Timestamp, &resp.Signature, &resp.SignatureMethod,
			&resp.SignatureAccount, &resp.SignatureVerifyingContract, &resp.SignatureChainId, &resp.SignatureCid,
			&resp.SignatureV, &resp.SignatureR, &resp.SignatureS, &resp.References, &resp.Uses, &resp.Size, &resp.Total); respsErr != nil {
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
		Account            internal.NullString `json:"account"`
		Name               internal.NullString `json:"name"`
		DefaultDataLicense internal.NullString `json:"default_data_license"`
		Authenticated      bool                `json:"authenticated"`
		Token              uuid.UUID           `json:"token"`
		Validity           time.Time           `json:"validity"`
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
	authenticateErr := authenticateResult.Scan(&authResp.Account, &authResp.Name, &authResp.DefaultDataLicense, &authResp.Authenticated, &authResp.Token, &authResp.Validity)
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

	for _, arg := range inputs {
		internal.WriteLog("info", fmt.Sprintf("arg %s", arg), "bacalhau-cli-wrapper")
	}

	for i, arg := range swarm {
		swarm[i] = rp.Replace(arg)
	}

	configSwarmStr := config["bacalhau_swarm"]
	configSwarm := strings.Split(configSwarmStr, ",")
	for i, arg := range configSwarm {
		configSwarm[i] = rp.Replace(arg)
	}

	swarm = append(swarm, configSwarm...)

	swarmStr := strings.Join(swarm, ",")

	for _, arg := range swarm {
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

		//		stateCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\" | select(.State==(\"Completed\", \"Error\")) | .State'", outStr)
		stateCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.State | select(.State==(\"Completed\", \"Error\")) | .State'", outStr)
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

			//			errorStatusCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\" | select(.State==(\"Error\")) | .Status'", outStr)
			errorStatusCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.State | select(.State==(\"Error\")) | .Status'", outStr)
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
	//	successCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.Status.JobState.Nodes[] | .Shards.\"0\".PublishedResults | select(.CID) | .CID'", outStr)
	successCmd := fmt.Sprintf("bacalhau describe %s | yq -r '.State | .Shards[].Executions[].PublishedResults | select(.CID) | .CID'", outStr)
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
		"bacalhau-job", outStrL, outStr, account, token)

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

func addCborDag(w http.ResponseWriter, r *http.Request) {
	// declare auth response type
	type AuthResp struct {
		Account            internal.NullString `json:"account"`
		Name               internal.NullString `json:"name"`
		DefaultDataLicense internal.NullString `json:"default_data_license"`
		Authenticated      bool                `json:"authenticated"`
		Token              uuid.UUID           `json:"token"`
		Validity           time.Time           `json:"validity"`
	}

	// declare request type
	type Req struct {
		Token string      `json:"token"`
		Dag   interface{} `json:"dag"`
	}

	// declare response type
	type Resp struct {
		Cid string `json:"cid"`
	}

	var req Req
	var dag interface{}
	var resp Resp

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&req)

	if decoderErr != nil {
		b, _ := io.ReadAll(r.Body)
		message := fmt.Sprintf("Decoding %s as JSON failed.", string(b))
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
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
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	// try authenticating with the gathered token
	authenticateResult := db.QueryRow(context.Background(), "select * from co2_storage_api.authenticate($1);", uuidToken.String())

	var authResp AuthResp

	// scan response for token and its validity time
	authenticateErr := authenticateResult.Scan(&authResp.Account, &authResp.Name, &authResp.DefaultDataLicense, &authResp.Authenticated, &authResp.Token, &authResp.Validity)
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
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(jsonMessage))
		return
	}

	dag = req.Dag
	blockData, blockDataErr := json.Marshal(dag)
	if blockDataErr != nil {
		message := fmt.Sprintf("Can not marshal dag. (%s)", blockDataErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	node, nodeErr := ipldCbor.FromJSON(strings.NewReader(string(blockData)), mh.SHA2_256, mh.DefaultLengths[mh.SHA2_256])
	if nodeErr != nil {
		message := fmt.Sprintf("Can not create dag node. (%s)", nodeErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(jsonMessage))
		return
	}

	addDagErr := sh.Dag().Add(context.Background(), node)
	if addDagErr != nil {
		message := fmt.Sprintf("Can not add dag structure. (%s)", addDagErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	resp.Cid = node.Cid().String()

	// send response
	respListJson, errJson := json.Marshal(resp)
	if errJson != nil {
		message := "Cannot marshal added CID response."
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

func addFile(w http.ResponseWriter, r *http.Request) {
	// declare auth response type
	type AuthResp struct {
		Account            internal.NullString `json:"account"`
		Name               internal.NullString `json:"name"`
		DefaultDataLicense internal.NullString `json:"default_data_license"`
		Authenticated      bool                `json:"authenticated"`
		Token              uuid.UUID           `json:"token"`
		Validity           time.Time           `json:"validity"`
	}

	// Socket connection
	wsc := wsConn{}
	var err error

	// Open websocket connection
	upgrader := websocket.Upgrader{HandshakeTimeout: time.Second * HandshakeTimeoutSecs, CheckOrigin: func(r *http.Request) bool { return true }}
	wsc.conn, err = upgrader.Upgrade(w, r, nil)
	if err != nil {
		message := fmt.Sprintf("Error on open of websocket connection: %s.", err)
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}
	defer wsc.conn.WriteControl(8, []byte{}, time.Now().Add(time.Second))
	defer wsc.conn.Close()

	// collect query parameters
	queryParams := r.URL.Query()

	// check for provided quesry parameters
	token := queryParams.Get("token")

	// check for provided quesry parameters
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
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(401, message, "", 0, "")
		return
	}

	// try authenticating with the gathered token
	authenticateResult := db.QueryRow(context.Background(), "select * from co2_storage_api.authenticate($1);", uuidToken.String())

	var authResp AuthResp

	// scan response for token and its validity time
	authenticateErr := authenticateResult.Scan(&authResp.Account, &authResp.Name, &authResp.DefaultDataLicense, &authResp.Authenticated, &authResp.Token, &authResp.Validity)
	if authenticateErr != nil {
		message := fmt.Sprintf("Invalid authentication response for token %s.", token)
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(401, message, "", 0, "")
		return
	}

	internal.WriteLog("info", fmt.Sprintf("Token %s for user %s is authenticated? %t.", authResp.Token, authResp.Account.String, authResp.Authenticated), "api")

	// Send error response if not authenticated
	if !authResp.Authenticated {
		message := fmt.Sprintf("Invalid authentication token %s.", token)
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(401, message, "", 0, "")
		return
	}

	// Get upload file name and length
	header := new(UploadHeader)
	mt, message, err := wsc.conn.ReadMessage()
	if err != nil {
		message := fmt.Sprintf("Error receiving websocket message: %s.", err)
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}
	if mt != websocket.TextMessage {
		message := "Invalid message received, expecting file name and length"
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}
	if err := json.Unmarshal(message, header); err != nil {
		message := fmt.Sprintf("Error receiving file name and length: %s", err.Error())
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}
	if len(header.Filename) == 0 {
		message := "Filename cannot be empty"
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}
	if header.Size == 0 {
		message := "Upload file is empty"
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, "", 0, "")
		return
	}

	// Create temp file to save file
	var tempFile *os.File
	if tempFile, err = os.CreateTemp("", fmt.Sprintf("websocket_upload_%s_", header.Filename)); err != nil {
		message := fmt.Sprintf("Could not create temp file: %s", err.Error())
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(400, message, header.Filename, 0, "")
		return
	}
	defer func() {
		tempFile.Close()
		_ = os.Remove(tempFile.Name())
	}()

	// Read file blocks until all bytes are received
	bytesRead := 0
	for {
		mt, message, err := wsc.conn.ReadMessage()
		if err != nil {
			message := fmt.Sprintf("Error receiving file block: %s", err.Error())
			internal.WriteLog("error", message, "api")
			wsc.sendStatus(400, message, header.Filename, 0, "")
			return
		}
		if mt != websocket.BinaryMessage {
			if mt == websocket.TextMessage {
				if string(message) == "CANCEL" {
					message := "Upload canceled"
					internal.WriteLog("error", message, "api")
					wsc.sendStatus(400, message, header.Filename, 0, "")
					return
				}
			}
			message := "Invalid file block received"
			internal.WriteLog("error", message, "api")
			wsc.sendStatus(400, message, header.Filename, 0, "")
			return
		}

		tempFile.Write(message)

		bytesRead += len(message)
		if bytesRead == header.Size {
			tempFile.Sync()
			break
		}
		wsc.sendPct(header.Filename, float64(bytesRead)/float64(header.Size)*100)

		wsc.requestNextBlock()
	}

	var unixfsAddOption options.UnixfsAddOption = func(uas *options.UnixfsAddSettings) error {
		uas.CidVersion = 1
		uas.MhType = mh.SHA2_256
		uas.Pin = true
		uas.Inline = false
		uas.InlineLimit = 32
		uas.RawLeaves = false
		uas.RawLeavesSet = false
		uas.Chunker = "size-262144"
		uas.Layout = options.BalancedLayout
		uas.OnlyHash = false
		uas.FsCache = false
		uas.NoCopy = false
		uas.Events = nil
		uas.Silent = false
		uas.Progress = false
		return nil
	}

	unixfsAddOptions := []options.UnixfsAddOption{
		unixfsAddOption,
	}

	fileStat, fileStatErr := os.Stat(tempFile.Name())
	if fileStatErr != nil {
		message := fmt.Sprintf("Can not read file stat for %s. (%s)", tempFile.Name(), fileStatErr.Error())
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(500, message, header.Filename, 100, "")
		return
	}
	file, fileErr := files.NewSerialFile(tempFile.Name(), false, fileStat)
	if fileErr != nil {
		message := fmt.Sprintf("Can not read file %s. (%s)", tempFile.Name(), fileErr.Error())
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(500, message, header.Filename, 100, "")
		return
	}
	path, pathErr := sh.Unixfs().Add(context.Background(), file, unixfsAddOptions...)
	if pathErr != nil {
		message := fmt.Sprintf("Can not add file %s. (%s)", token, pathErr.Error())
		internal.WriteLog("error", message, "api")
		wsc.sendStatus(500, message, header.Filename, 100, "")
		return
	}

	internal.WriteLog("info", fmt.Sprintf("File %s uploaded and pinned to attached IPFS node (%s)", header.Filename, path.Cid().String()), "api")
	wsc.sendStatus(200, "uploaded", header.Filename, 100, path.Cid().String())
}

func (wsc wsConn) requestNextBlock() {
	wsc.conn.WriteMessage(websocket.TextMessage, []byte("NEXT"))
}

func (wsc wsConn) sendStatus(code int, status string, filename string, progress float64, cid string) {
	if msg, err := json.Marshal(UploadStatus{Code: code, Status: status, Filename: &filename, Progress: &progress, Cid: &cid}); err == nil {
		wsc.conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func (wsc wsConn) sendPct(filename string, progress float64) {
	stat := UploadStatus{
		Status:   "uploading",
		filename: filename,
		progress: progress,
		cid:      "",
	}
	stat.Filename = &stat.filename
	stat.Progress = &stat.progress
	if msg, err := json.Marshal(stat); err == nil {
		wsc.conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func updateProfileName(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type UpdateProfileNameReq struct {
		Name    string `json:"name"`
		Account string `json:"account"`
		Token   string `json:"token"`
	}

	// declare response type
	type UpdateProfileNameResp struct {
		Account internal.NullString `json:"account"`
		Ts      time.Time           `json:"timestamp"`
		Updated bool                `json:"updated"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var updateProfileNameReq UpdateProfileNameReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&updateProfileNameReq)

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

	// try to update head record
	updateHeadResult := db.QueryRow(context.Background(), "select * from co2_storage_api.update_profile_name($1, $2, $3);",
		internal.SqlNullableString(updateProfileNameReq.Name), updateProfileNameReq.Account, updateProfileNameReq.Token)

	var updateProfileNameResp UpdateProfileNameResp
	if updateProfileNameRespErr := updateHeadResult.Scan(&updateProfileNameResp.Account, &updateProfileNameResp.Ts, &updateProfileNameResp.Updated); updateProfileNameRespErr != nil {
		message := fmt.Sprintf("Error occured whilst updating profile name record in a database. (%s)", updateProfileNameRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	updateProfileNameRespJson, errJson := json.Marshal(updateProfileNameResp)
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
	w.Write(updateProfileNameRespJson)
}

func updateProfileDefaultDataLicense(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type UpdateProfileDefaultDataLicenseReq struct {
		DefaultDataLicense string `json:"default_data_license"`
		Account            string `json:"account"`
		Token              string `json:"token"`
	}

	// declare response type
	type UpdateProfileDefaultDataLicenseResp struct {
		Account internal.NullString `json:"account"`
		Ts      time.Time           `json:"timestamp"`
		Updated bool                `json:"updated"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var updateProfileDefaultDataLicenseReq UpdateProfileDefaultDataLicenseReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&updateProfileDefaultDataLicenseReq)

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

	// try to update head record
	updateHeadResult := db.QueryRow(context.Background(), "select * from co2_storage_api.update_profile_default_data_license($1, $2, $3);",
		internal.SqlNullableString(updateProfileDefaultDataLicenseReq.DefaultDataLicense), updateProfileDefaultDataLicenseReq.Account, updateProfileDefaultDataLicenseReq.Token)

	var updateProfileDefaultDataLicenseResp UpdateProfileDefaultDataLicenseResp
	if updateProfileDefaultDataLicenseRespErr := updateHeadResult.Scan(&updateProfileDefaultDataLicenseResp.Account, &updateProfileDefaultDataLicenseResp.Ts, &updateProfileDefaultDataLicenseResp.Updated); updateProfileDefaultDataLicenseRespErr != nil {
		message := fmt.Sprintf("Error occured whilst updating profile default data license record in a database. (%s)", updateProfileDefaultDataLicenseRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	updateProfileDefaultDataLicenseRespJson, errJson := json.Marshal(updateProfileDefaultDataLicenseResp)
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
	w.Write(updateProfileDefaultDataLicenseRespJson)
}

func accountDataSize(w http.ResponseWriter, r *http.Request) {
	// declare types
	type Record struct {
		Creator internal.NullString `json:"creator"`
		Size    internal.NullInt64  `json:"size"`
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

	internal.WriteLog("info", fmt.Sprintf("Trying to calculate assets size in for the account %s authenticated with token %s.", account, token), "api")

	// search a key
	row := db.QueryRow(context.Background(), "select * from co2_storage_scraper.account_content_size($1, $2::uuid);",
		account, uuidToken.String())

	// declare response
	var resp Record

	// scan response
	rowErr := row.Scan(&resp.Creator, &resp.Size)

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

func addFunction(w http.ResponseWriter, r *http.Request) {
	// declare request type
	type AddFunctionReq struct {
		Account           string `json:"account"`
		Token             string `json:"token"`
		Name              string `json:"name"`
		Description       string `json:"description"`
		FunctionType      string `json:"function_type"`
		FunctionContainer string `json:"function_container"`
		InputType         string `json:"input_type"`
		OutputType        string `json:"output_type"`
	}

	// declare response type
	type AddFunctionResp struct {
		Account internal.NullString `json:"account"`
		Name    internal.NullString `json:"name"`
		Id      internal.NullInt32  `json:"id"`
	}

	// set defalt response content type
	w.Header().Set("Content-Type", "application/json")

	// collect request parameters
	var addFunctionReq AddFunctionReq

	decoder := json.NewDecoder(r.Body)
	decoderErr := decoder.Decode(&addFunctionReq)

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
	addFunctionResult := db.QueryRow(context.Background(), "select * from co2_storage_api.add_function($1, $2::uuid, $3, $4, $5, $6, $7, $8);",
		addFunctionReq.Account, addFunctionReq.Token, addFunctionReq.Name, addFunctionReq.Description, addFunctionReq.FunctionType,
		addFunctionReq.FunctionContainer, internal.SqlNullableString(addFunctionReq.InputType), addFunctionReq.OutputType)

	var addFunctionResp AddFunctionResp
	if addFunctionRespErr := addFunctionResult.Scan(&addFunctionResp.Account, &addFunctionResp.Name, &addFunctionResp.Id); addFunctionRespErr != nil {
		message := fmt.Sprintf("Error occured whilst adding function definition into a database. (%s)", addFunctionRespErr.Error())
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// send response
	addFunctionRespJson, errJson := json.Marshal(addFunctionResp)
	if errJson != nil {
		message := "Cannot marshal the database response for newly added function."
		jsonMessage := fmt.Sprintf("{\"message\":\"%s\"}", message)
		internal.WriteLog("error", message, "api")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(jsonMessage))
		return
	}

	// response writter
	w.WriteHeader(http.StatusOK)
	w.Write(addFunctionRespJson)
}

func searchFunctions(w http.ResponseWriter, r *http.Request) {
	// declare response type
	type Resp struct {
		Id                internal.NullInt32  `json:"id"`
		Name              internal.NullString `json:"name"`
		Description       internal.NullString `json:"description"`
		FunctionType      internal.NullString `json:"function_type"`
		FunctionContainer internal.NullString `json:"function_container"`
		InputType         internal.NullString `json:"input_type"`
		OutputType        internal.NullString `json:"output_type"`
		Creator           internal.NullString `json:"creator"`
		Uses              int64               `json:"uses"`
		Created           internal.NullTime   `json:"created"`
		Retired           internal.NullBool   `json:"retired"`
		Total             int64               `json:"total"`
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
	name := queryParams.Get("name")
	description := queryParams.Get("description")
	functionType := queryParams.Get("function_type")
	functionContainer := queryParams.Get("function_container")
	inputType := queryParams.Get("input_type")
	outputType := queryParams.Get("output_type")
	retired := queryParams.Get("retired")
	creator := queryParams.Get("creator")
	createdFrom := queryParams.Get("created_from")
	createdTo := queryParams.Get("created_to")
	offset := queryParams.Get("offset")
	limit := queryParams.Get("limit")
	sortBy := queryParams.Get("sort_by")
	sortDir := queryParams.Get("sort_dir")

	// search through scraped content
	rows, rowsErr := db.Query(context.Background(), "select * from co2_storage_api.search_functions($1, $2, $3, $4, $5, $6, $7, $8::boolean, $9, $10::timestamptz, $11::timestamptz, $12, $13, $14, $15);",
		phrasesListSql, internal.SqlNullableString(name), internal.SqlNullableString(description), internal.SqlNullableString(functionType), internal.SqlNullableString(functionContainer),
		internal.SqlNullableString(inputType), internal.SqlNullableString(outputType), retired, internal.SqlNullableString(creator), internal.SqlNullableString(createdFrom), internal.SqlNullableString(createdTo),
		internal.SqlNullableIntFromString(offset), internal.SqlNullableIntFromString(limit), internal.SqlNullableString(sortBy), internal.SqlNullableString(sortDir))

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "Error occured whilst searching through existing functions."
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
		if respsErr := rows.Scan(&resp.Id, &resp.Name, &resp.Description, &resp.FunctionType, &resp.FunctionContainer,
			&resp.InputType, &resp.OutputType, &resp.Creator, &resp.Uses, &resp.Created, &resp.Total); respsErr != nil {
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
