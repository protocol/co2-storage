package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/adgsm/co2-storage-head-sync/helpers"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"

	shell "github.com/ipfs/go-ipfs-api"
)

func main() {
	// Set configs file path
	confsPath := "configs/configs"

	// Read configs
	config, rcerr := helpers.ReadConfigs(confsPath)

	if rcerr != nil {
		panic(rcerr)
	}

	// Cast port to int
	port, atoierr := strconv.Atoi(config["postgresql_port"])

	if atoierr != nil {
		panic(atoierr)
	}

	// Init db connection
	db, dberr := helpers.DbInit(config["postgresql_host"], port,
		config["postgresql_user"], goDotEnvVariable(config["postgresql_password"]), config["postgresql_database"])

	if dberr != nil {
		panic(dberr)
	}

	defer db.Close()

	// Collect input vars (chain head CID and chain name)
	head, chainName, argsErr := parseArgs()
	if argsErr != nil {
		helpers.WriteLog("error", argsErr.Error(), "head-sync")
		os.Exit(1)
	}

	helpers.WriteLog("info", fmt.Sprintf("head %s, chain %s", head, chainName), "head-sync")

	ipfsNode := "/ip4/127.0.0.1/tcp/5001"
	sh := shell.NewShell(ipfsNode)

	if !sh.IsUp() {
		helpers.WriteLog("error", fmt.Sprintf("IPFS node %s is not ready.", ipfsNode), "head-sync")
		os.Exit(1)
	}

	var parentErr error
	parent := head
	for parentErr == nil {
		parent, parentErr = parseHead(db, sh, parent, chainName)
	}
}

// Collect and parse args
func parseArgs() (head string, chainName string, bad error) {
	args := os.Args[1:]
	if len(args) < 2 {
		return "", "", errors.New("program needs two input parameters, the head record CID and chain name")
	}

	return args[0], args[1], nil
}

// Parse head record dag structure
func parseHead(db *pgxpool.Pool, sh *shell.Shell, head string, chainName string) (parentHead string, bad error) {
	var headRecord map[string]interface{}
	headRecordErr := sh.DagGet(head, &headRecord)
	if headRecordErr != nil {
		helpers.WriteLog("error", headRecordErr.Error(), "head-sync")
		return "", headRecordErr
	}

	_, headRecordExistErr := recordExist(db, head, chainName)
	if headRecordExistErr == nil {
		helpers.WriteLog("error", "Head record is already existing.", "head-sync")
		return "", errors.New("head record is already existing")
	}

	timestamp := headRecord["timestamp"]
	helpers.WriteLog("info", fmt.Sprintf("timestamp %s", timestamp), "head-sync")

	delete(headRecord, "timestamp")

	statement := "insert into co2_storage_api.chain (\"chain_name\", \"head\", \"account\", \"timestamp\") values ($1, $2, $3, $4::timestamptz);"
	_, execErr := db.Exec(context.Background(), statement, chainName, head, "0x0000000000000000000000000000000000000000", timestamp)
	if execErr != nil {
		return "", execErr
	}

	parent := headRecord["parent"]
	helpers.WriteLog("info", fmt.Sprintf("parent %s", parent), "head-sync")

	delete(headRecord, "parent")

	version := headRecord["version"]
	helpers.WriteLog("info", fmt.Sprintf("version %s", version), "head-sync")

	delete(headRecord, "version")

	//	for key, val := range headRecord {
	//		helpers.WriteLog("info", fmt.Sprintf("%s: %s", key, val), "head-sync")
	//	}

	strParent := fmt.Sprintf("%v", parent)

	return strParent, nil
}

// Load/read the .env file and
// return the value of the key
func goDotEnvVariable(key string) string {
	// load .env file
	err := godotenv.Load(".env")

	if err != nil {
		panic(err)
	}

	return os.Getenv(key)
}

// Check do we have parent head record
func recordExist(db *pgxpool.Pool, parent string, chainName string) (exist bool, bad error) {
	// declare types
	type Record struct {
		Head      string    `json:"head"`
		Account   string    `json:"account"`
		Timestamp time.Time `json:"timestamp"`
	}

	// search for latest heading CID
	var resp Record
	if chainName == "" {
		chainName = "sandbox"
	}

	helpers.WriteLog("info", fmt.Sprintf("Looking for head record %s in chain %s.", parent, chainName), "api")

	sql := "select \"head\", \"account\", \"timestamp\" from co2_storage_api.chain where \"chain_name\" = $1 and \"head\" = $2 order by \"timestamp\" desc limit 1;"
	row := db.QueryRow(context.Background(), sql, chainName, parent)

	// scan response
	rowErr := row.Scan(&resp.Head, &resp.Account, &resp.Timestamp)

	if rowErr != nil {
		return false, rowErr
	}

	return true, nil
}
