package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/adgsm/co2-storage-indexer/helpers"
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

	ipfsNode := "/ip4/127.0.0.1/tcp/5001"
	sh := shell.NewShell(ipfsNode)

	if !sh.IsUp() {
		message := fmt.Sprintf("IPFS node %s is not ready.", ipfsNode)
		helpers.WriteLog("error", message, "indexer")
		panic(errors.New(message))
	}

	headNodes, headNoderErr := unindexedHeadNodes(db)
	if headNoderErr != nil {
		message := headNoderErr.Error()
		helpers.WriteLog("error", message, "indexer")
		panic(message)
	}

	helpers.WriteLog("info", strings.Join(headNodes, ", "), "indexer")

	for _, headNode := range headNodes {
		time.Sleep(100 * time.Millisecond)
		go parseHead(db, sh, headNode)
	}

	// make it run forever
	done := make(chan bool)
	<-done
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

// Retrieve all head nodes that are not indexed
func unindexedHeadNodes(db *pgxpool.Pool) (nodes []string, bad error) {
	helpers.WriteLog("info", "Looking head records that are not indexed yet", "indexer")

	sql := "select \"head\" from co2_storage_api.chain where \"scraped\" is null order by \"timestamp\" asc;"
	// query database for non indexed head records
	rows, rowsErr := db.Query(context.Background(), sql)

	if rowsErr != nil {
		message := rowsErr.Error()
		fmt.Print(message)
		helpers.WriteLog("error", message, "indexer")
		return []string{}, rowsErr
	}

	defer rows.Close()

	// declare response
	records := []string{}

	for rows.Next() {
		var record string
		if recordsErr := rows.Scan(&record); recordsErr != nil {
			message := recordsErr.Error()
			fmt.Print(message)
			helpers.WriteLog("error", message, "indexer")
			return []string{}, recordsErr
		}
		records = append(records, record)
	}

	return records, nil
}

// Parse head record dag structure
func parseHead(db *pgxpool.Pool, sh *shell.Shell, head string) {
	// Mark head record processing
	scrapingStartedStatement := "update co2_storage_api.chain set \"scraped\" = false where \"head\" = $1;"
	_, scrapingStartedErr := db.Exec(context.Background(), scrapingStartedStatement, head)
	if scrapingStartedErr != nil {
		helpers.WriteLog("error", scrapingStartedErr.Error(), "indexer")
		return
	}

	var headRecord map[string]interface{}
	headRecordErr := sh.DagGet(head, &headRecord)
	if headRecordErr != nil {
		helpers.WriteLog("error", headRecordErr.Error(), "indexer")
		return
	}

	parent := headRecord["parent"]
	delete(headRecord, "parent")
	version := headRecord["version"]
	delete(headRecord, "version")
	timestamp := headRecord["timestamp"]
	delete(headRecord, "timestamp")
	helpers.WriteLog("info", fmt.Sprintf("Started parsing head record %s (version %s, version %s, version %s).",
		head, parent, version, timestamp), "indexer")

	for key, val := range headRecord {
		parseAccount(db, sh, key, fmt.Sprintf("%v", val))
		helpers.WriteLog("info", fmt.Sprintf("%s: %s", key, val), "indexer")
	}
}

// Parse and index account record's dag structure
func parseAccount(db *pgxpool.Pool, sh *shell.Shell, account string, cid string) {
	// Check is this account already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for account record %s pointing to CID %s.", account, cid), "indexer")

	sql := "select \"id\" from co2_storage_scraper.contents where \"data_structure\" = $1 and \"cid\" = $2 and \"name\" = $3 limit 1;"
	row := db.QueryRow(context.Background(), sql, "account", cid, account)

	// scan response
	var id int
	rowErr := row.Scan(&id)

	if rowErr == nil {
		helpers.WriteLog("info", fmt.Sprintf("Account record %s pointing to CID %s is already indexed.", account, cid), "indexer")
		return
	}

	// Get account dag structure
	var accountRecord map[string]interface{}
	accountRecordErr := sh.DagGet(cid, &accountRecord)
	if accountRecordErr != nil {
		helpers.WriteLog("error", accountRecordErr.Error(), "indexer")
		return
	}

	parent := accountRecord["parent"]
	wallet := accountRecord["wallet"] // same as account
	version := accountRecord["version"]
	timestamp := accountRecord["timestamp"]

	// Add account metadata to the database
	accountStatement := "insert into co2_storage_scraper.contents (\"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"creator\", \"timestamp\") values ($1, $2, $3, $4, $5, $6, $7::timestamptz);"
	_, accountStatementErr := db.Exec(context.Background(), accountStatement, "account", version, cid, parent, wallet, account, timestamp)

	if accountStatementErr != nil {
		return
	}

	// Parse templates
	for _, templateCid := range accountRecord["templates"].([]interface{}) {
		time.Sleep(10 * time.Millisecond)
		go parseTemplateRecord(db, sh, fmt.Sprintf("%v", templateCid))
	}

	// Parse assets
	for _, assetCid := range accountRecord["assets"].([]interface{}) {
		time.Sleep(10 * time.Millisecond)
		go parseAssetRecord(db, sh, fmt.Sprintf("%v", assetCid))
	}
}

// Parse and index template record's dag structure
func parseTemplateRecord(db *pgxpool.Pool, sh *shell.Shell, cid string) {
	// Check is this template record already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for template CID %s.", cid), "indexer")

	sql := "select \"id\" from co2_storage_scraper.contents where \"data_structure\" = $1 and \"cid\" = $2 limit 1;"
	row := db.QueryRow(context.Background(), sql, "template", cid)

	// scan response
	var id int
	rowErr := row.Scan(&id)

	if rowErr == nil {
		helpers.WriteLog("info", fmt.Sprintf("Template record %s is already indexed.", cid), "indexer")
		return
	}

	// Get template record dag structure
	var templateRecord map[string]interface{}
	templateRecordErr := sh.DagGet(cid, &templateRecord)
	if templateRecordErr != nil {
		helpers.WriteLog("error", templateRecordErr.Error(), "indexer")
		return
	}

	contentCid := templateRecord["cid"]

	// Get template dag structure
	var template map[string]interface{}
	templateErr := sh.DagGet(fmt.Sprintf("%v", contentCid), &template)
	if templateErr != nil {
		helpers.WriteLog("error", templateErr.Error(), "indexer")
		return
	}

	var contentList []string
	for key := range template {
		contentList = append(contentList, key)
	}

	name := templateRecord["name"]
	base := templateRecord["base"]
	reference := templateRecord["reference"]
	description := templateRecord["description"]
	parent := templateRecord["parent"]
	creator := templateRecord["creator"]
	version := templateRecord["version"]
	timestamp := templateRecord["timestamp"]

	// Add template metadata to the database
	templateStatement := "insert into co2_storage_scraper.contents (\"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"description\", \"base\", \"reference\", \"content_cid\", \"content\", \"creator\", \"timestamp\") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz);"
	_, templateStatementErr := db.Exec(context.Background(), templateStatement, "template", version, cid, parent, name, description, base, reference, contentCid, strings.Join(contentList, ", "), creator, timestamp)

	if templateStatementErr != nil {
		return
	}
}

// Parse and index asset record's dag structure
func parseAssetRecord(db *pgxpool.Pool, sh *shell.Shell, cid string) {
	// Check is this asset record already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for asset CID %s.", cid), "indexer")

	sql := "select \"id\" from co2_storage_scraper.contents where \"data_structure\" = $1 and \"cid\" = $2 limit 1;"
	row := db.QueryRow(context.Background(), sql, "asset", cid)

	// scan response
	var id int
	rowErr := row.Scan(&id)

	if rowErr == nil {
		helpers.WriteLog("info", fmt.Sprintf("Asset record %s is already indexed.", cid), "indexer")
		return
	}

	// Get asset record dag structure
	var assetRecord map[string]interface{}
	assetRecordErr := sh.DagGet(cid, &assetRecord)
	if assetRecordErr != nil {
		helpers.WriteLog("error", assetRecordErr.Error(), "indexer")
		return
	}

	contentCid := assetRecord["cid"]

	// Get asset dag structure
	var asset map[string]interface{}
	assetErr := sh.DagGet(fmt.Sprintf("%v", contentCid), &asset)
	if assetErr != nil {
		helpers.WriteLog("error", assetErr.Error(), "indexer")
		return
	}

	// Parse asset, TODO
	var content string
	for _, contentObject := range asset["data"].([]interface{}) {
		for key, val := range contentObject.(map[string]interface{}) {
			helpers.WriteLog("warn", fmt.Sprintf("%v (%T): %v (%T)", key, key, val, val), "indexer")
		}
	}

	name := assetRecord["name"]
	reference := assetRecord["template"]
	description := assetRecord["description"]
	parent := assetRecord["parent"]
	creator := assetRecord["creator"]
	version := assetRecord["version"]
	timestamp := assetRecord["timestamp"]

	// Add asset metadata to the database
	assetStatement := "insert into co2_storage_scraper.contents (\"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"description\", \"reference\", \"content_cid\", \"content\", \"creator\", \"timestamp\") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz);"
	_, assetStatementErr := db.Exec(context.Background(), assetStatement, "asset", version, cid, parent, name, description, reference, contentCid, content, creator, timestamp)

	if assetStatementErr != nil {
		return
	}
}
