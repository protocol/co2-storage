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
	"github.com/robfig/cron/v3"

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

	ipfsNode := config["ipfs_node"]
	sh := shell.NewShell(ipfsNode)

	if !sh.IsUp() {
		message := fmt.Sprintf("IPFS node %s is not ready.", ipfsNode)
		helpers.WriteLog("error", message, "indexer")
		panic(errors.New(message))
	}

	// instantiate cron
	crn := cron.New()

	crn.AddFunc(config["scrape_ipfs_every"], func() {
		headNodes, headNoderErr := unindexedHeadNodes(db)
		if headNoderErr != nil {
			message := headNoderErr.Error()
			helpers.WriteLog("error", message, "indexer")
			panic(message)
		}

		for _, headNode := range headNodes {
			time.Sleep(100 * time.Millisecond)
			go parseHead(db, sh, headNode)
		}
	})

	// start cron
	crn.Start()

	defer crn.Stop()

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

// declare response
type HeadResp struct {
	Head      string
	ChainName string
}

// Retrieve all head nodes that are not indexed
func unindexedHeadNodes(db *pgxpool.Pool) (nodes []HeadResp, bad error) {
	helpers.WriteLog("info", "Looking head records that are not indexed yet", "indexer")

	sql := "select \"head\", \"chain_name\" from co2_storage_api.chain where \"scraped\" is null order by \"timestamp\" asc;"
	// query database for non indexed head records
	rows, rowsErr := db.Query(context.Background(), sql)

	if rowsErr != nil {
		message := rowsErr.Error()
		fmt.Print(message)
		helpers.WriteLog("error", message, "indexer")
		return nil, rowsErr
	}

	defer rows.Close()

	// declare response
	records := []HeadResp{}

	for rows.Next() {
		var record HeadResp
		if recordsErr := rows.Scan(&record.Head, &record.ChainName); recordsErr != nil {
			message := recordsErr.Error()
			fmt.Print(message)
			helpers.WriteLog("error", message, "indexer")
			return nil, recordsErr
		}
		records = append(records, record)
	}

	return records, nil
}

// Parse head record dag structure
func parseHead(db *pgxpool.Pool, sh *shell.Shell, head HeadResp) {
	// Mark head record processing
	scrapingStartedStatement := "update co2_storage_api.chain set \"scraped\" = true where \"head\" = $1;"
	_, scrapingStartedErr := db.Exec(context.Background(), scrapingStartedStatement, head.Head)
	if scrapingStartedErr != nil {
		helpers.WriteLog("error", scrapingStartedErr.Error(), "indexer")
		return
	}

	var headRecord map[string]interface{}
	headRecordErr := sh.DagGet(head.Head, &headRecord)
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
	helpers.WriteLog("info", fmt.Sprintf("Started parsing head record %s (parent %s, version %s, timestamp %s).",
		head, parent, version, timestamp), "indexer")

	for key, val := range headRecord {
		parseAccount(db, sh, key, fmt.Sprintf("%v", val), head.ChainName)
		helpers.WriteLog("info", fmt.Sprintf("%s: %s", key, val), "indexer")
	}
}

// Parse and index account record's dag structure
func parseAccount(db *pgxpool.Pool, sh *shell.Shell, account string, cid string, chain string) {
	// Check is this account already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for account record %s pointing to CID %s in chain %s.", account, cid, chain), "indexer")

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
	accountStatement := "insert into co2_storage_scraper.contents (\"chain_name\", \"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"creator\", \"timestamp\") values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz);"
	_, accountStatementErr := db.Exec(context.Background(), accountStatement, chain, "account", version, cid, parent, wallet, account, timestamp)

	if accountStatementErr != nil {
		return
	}

	// Parse templates
	if _, ok := accountRecord["templates"].([]interface{}); ok {
		for _, templateCid := range accountRecord["templates"].([]interface{}) {
			time.Sleep(10 * time.Millisecond)
			go parseTemplateRecord(db, sh, fmt.Sprintf("%v", templateCid), chain)
		}
	}

	// Parse assets
	if _, ok := accountRecord["assets"].([]interface{}); ok {
		for _, assetCid := range accountRecord["assets"].([]interface{}) {
			time.Sleep(10 * time.Millisecond)
			go parseAssetRecord(db, sh, fmt.Sprintf("%v", assetCid), chain)
		}
	}

	// Parse provenance mesaages
	if _, ok := accountRecord["provenance"].([]interface{}); ok {
		for _, provenanceCid := range accountRecord["provenance"].([]interface{}) {
			time.Sleep(10 * time.Millisecond)
			go parseProvenanceRecord(db, sh, fmt.Sprintf("%v", provenanceCid), chain)
		}
	}
}

// Parse and index template record's dag structure
func parseTemplateRecord(db *pgxpool.Pool, sh *shell.Shell, cid string, chain string) {
	// Check is this template record already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for template CID %s in chain %s.", cid, chain), "indexer")

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
	var template interface{}
	templateErr := sh.DagGet(fmt.Sprintf("%v", contentCid), &template)
	if templateErr != nil {
		helpers.WriteLog("error", templateErr.Error(), "indexer")
		return
	}

	var contentList []string

	if _, ok := template.([]interface{}); ok { // Template is list of objects or list of lists
		for _, el := range template.([]interface{}) {
			if _, ok := el.(map[string]interface{}); ok { // Template is list of objects
				for key := range el.(map[string]interface{}) {
					contentList = append(contentList, key)
				}
			} else if _, ok := el.([]interface{}); ok { // Template is list of lists
				if len(el.([]interface{})) == 2 {
					contentList = append(contentList, el.([]interface{})[0].(string))
				}
			}
		}
	} else if _, ok := template.(map[string]interface{}); ok { // Template is an object
		for key := range template.(map[string]interface{}) {
			contentList = append(contentList, key)
		}
	}

	name := templateRecord["name"]
	base := templateRecord["base"]
	reference := templateRecord["reference"]
	description := templateRecord["description"]
	parent := templateRecord["parent"]
	creator := templateRecord["creator"]
	version := templateRecord["version"]
	timestamp := templateRecord["timestamp"]
	signed := templateRecord["signed"]

	var signature string
	var signatureMethod string
	var signatureAccount string
	var signatureVerifyingContract string
	var signatureChainId string
	var signatureCid string
	var signatureV float64
	var signatureR string
	var signatureS string

	if signed != nil {
		signedMap := signed.(map[string]interface{})
		signature = signedMap["signature"].(string)
		signatureMethod = signedMap["method"].(string)
		signatureAccount = signedMap["account"].(string)
		signatureVerifyingContract = signedMap["verifyingContract"].(string)
		if _, ok := signedMap["chainId"].(float64); ok {
			signatureChainId = fmt.Sprintf("%f", signedMap["chainId"])
		} else {
			signatureChainId = signedMap["chainId"].(string)
		}
		signatureCid = signedMap["cid"].(string)
		signatureV = signedMap["v"].(float64)
		signatureR = signedMap["r"].(string)
		signatureS = signedMap["s"].(string)
	}

	// Add template metadata to the database
	templateStatement := "insert into co2_storage_scraper.contents (\"chain_name\", \"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"description\", \"base\", \"reference\", \"content_cid\", \"content\", \"creator\", \"timestamp\", \"signature\", \"signature_method\", \"signature_account\", \"signature_verifying_contract\", \"signature_chain_id\", \"signature_cid\", \"signature_v\", \"signature_r\", \"signature_s\") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz, $14, $15, $16, $17, $18, $19, $20, $21, $22);"
	_, templateStatementErr := db.Exec(context.Background(), templateStatement, chain, "template", version, cid, parent, name, description, base, reference, contentCid, strings.Join(contentList, " "), creator, timestamp,
		signature, signatureMethod, signatureAccount, signatureVerifyingContract, signatureChainId, signatureCid, signatureV, signatureR, signatureS)

	if templateStatementErr != nil {
		return
	}
}

// Parse and index asset record's dag structure
func parseAssetRecord(db *pgxpool.Pool, sh *shell.Shell, cid string, chain string) {
	// Check is this asset record already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for asset CID %s in chain %s.", cid, chain), "indexer")

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

	name := assetRecord["name"]
	reference := assetRecord["template"]
	description := assetRecord["description"]
	parent := assetRecord["parent"]
	creator := assetRecord["creator"]
	version := assetRecord["version"]
	timestamp := assetRecord["timestamp"]
	signed := assetRecord["signed"]

	var signature string
	var signatureMethod string
	var signatureAccount string
	var signatureVerifyingContract string
	var signatureChainId string
	var signatureCid string
	var signatureV float64
	var signatureR string
	var signatureS string

	if signed != nil {
		signedMap := signed.(map[string]interface{})
		signature = signedMap["signature"].(string)
		signatureMethod = signedMap["method"].(string)
		signatureAccount = signedMap["account"].(string)
		signatureVerifyingContract = signedMap["verifyingContract"].(string)
		if _, ok := signedMap["chainId"].(float64); ok {
			signatureChainId = fmt.Sprintf("%f", signedMap["chainId"])
		} else {
			signatureChainId = signedMap["chainId"].(string)
		}
		signatureCid = signedMap["cid"].(string)
		signatureV = signedMap["v"].(float64)
		signatureR = signedMap["r"].(string)
		signatureS = signedMap["s"].(string)
	}

	// Parse asset, TODO parse documents with Tika
	contentCid := assetRecord["cid"]
	var contentList []string

	// Get asset dag structure
	switch version {
	case "1.0.0":
		var asset map[string]interface{}
		assetErr := sh.DagGet(fmt.Sprintf("%v", contentCid), &asset)
		if assetErr != nil {
			helpers.WriteLog("error", assetErr.Error(), "indexer")
			return
		}
		contentList = _deepParse(asset["data"])
	case "1.0.1":
		var asset []interface{}
		assetErr := sh.DagGet(fmt.Sprintf("%v", contentCid), &asset)
		if assetErr != nil {
			helpers.WriteLog("error", assetErr.Error(), "indexer")
			return
		}
		contentList = _deepParse(asset)
	default:
		return
	}

	// Add asset metadata to the database
	assetStatement := "insert into co2_storage_scraper.contents (\"chain_name\", \"data_structure\", \"version\", \"cid\", \"parent\", \"name\", \"description\", \"reference\", \"content_cid\", \"content\", \"creator\", \"timestamp\", \"signature\", \"signature_method\", \"signature_account\", \"signature_verifying_contract\", \"signature_chain_id\", \"signature_cid\", \"signature_v\", \"signature_r\", \"signature_s\") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13, $14, $15, $16, $17, $18, $19, $20, $21);"
	_, assetStatementErr := db.Exec(context.Background(), assetStatement, chain, "asset", version, cid, parent, name, description, reference, contentCid, strings.Join(contentList, " "), creator, timestamp,
		signature, signatureMethod, signatureAccount, signatureVerifyingContract, signatureChainId, signatureCid, signatureV, signatureR, signatureS)

	if assetStatementErr != nil {
		return
	}
}

func _deepParse(m interface{}) []string {
	var contentList []string
	if _, ok := m.([]interface{}); ok {
		for _, contentObject := range m.([]interface{}) {
			if contentObject == nil {
				continue
			}
			if _, ok := contentObject.(string); ok {
				contentList = append(contentList, fmt.Sprintf("%v", contentObject))
			} else {
				contentList = append(contentList, _deepParse(contentObject)...)
			}
		}
	} else if _, ok := m.(map[string]interface{}); ok {
		for key, val := range m.(map[string]interface{}) {
			helpers.WriteLog("info", fmt.Sprintf("%v (%T): %v (%T)", key, key, val, val), "indexer")
			if val == nil {
				continue
			}
			if _, ok := val.(string); ok {
				contentList = append(contentList, fmt.Sprintf("%v", val))
			}
			if _, ok := val.([]interface{}); ok {
				contentList = append(contentList, _deepParse(val)...)
			}
			if _, ok := val.(map[string]interface{}); ok {
				contentList = append(contentList, _deepParse(val)...)
			}
		}
	}
	return contentList
}

// Parse and index provenance record's dag structure
func parseProvenanceRecord(db *pgxpool.Pool, sh *shell.Shell, cid string, chain string) {
	// Check is this provenance record already indexed
	helpers.WriteLog("info", fmt.Sprintf("Looking for provenance CID %s in chain %s.", cid, chain), "indexer")

	sql := "select \"id\" from co2_storage_scraper.contents where \"data_structure\" = $1 and \"cid\" = $2 limit 1;"
	row := db.QueryRow(context.Background(), sql, "provenance", cid)

	// scan response
	var id int
	rowErr := row.Scan(&id)

	if rowErr == nil {
		helpers.WriteLog("info", fmt.Sprintf("Provenance record %s is already indexed.", cid), "indexer")
		return
	}

	// Get provenance record dag structure
	var provenanceRecord map[string]interface{}
	provenanceRecordErr := sh.DagGet(cid, &provenanceRecord)
	if provenanceRecordErr != nil {
		helpers.WriteLog("error", provenanceRecordErr.Error(), "indexer")
		return
	}

	provenanceMessageCid := provenanceRecord["provenance_message"].(string)

	// Get provenance message dag structure
	var provenanceMessage map[string]interface{}
	provenanceMessageErr := sh.DagGet(provenanceMessageCid, &provenanceMessage)
	if provenanceMessageErr != nil {
		helpers.WriteLog("error", provenanceMessageErr.Error(), "indexer")
		return
	}

	var name string
	if _, ok := provenanceMessage["contributor_name"].(string); ok {
		name = provenanceMessage["contributor_name"].(string)
	} else {
		name = provenanceMessage["contributor_key"].(string)
	}

	version := provenanceRecord["version"].(string)
	creator := provenanceRecord["contributor_key"].(string)

	var description string
	if _, ok := provenanceMessage["notes"].(string); ok {
		description = provenanceMessage["notes"].(string)
	} else {
		description = ""
	}

	protocol := provenanceRecord["protocol"].(string)

	var license string
	if _, ok := provenanceMessage["data_license"].(string); ok {
		license = provenanceMessage["data_license"].(string)
	} else {
		license = ""
	}

	timestamp := provenanceRecord["timestamp"].(string)

	var reference string
	if _, ok := provenanceMessage["payload"].(string); ok {
		reference = provenanceMessage["payload"].(string)
	} else {
		return
	}
	signature := provenanceRecord["signature"].(string)
	signatureMethod := provenanceRecord["method"].(string)
	signatureAccount := provenanceRecord["contributor_key"].(string)
	signatureVerifyingContract := provenanceRecord["verifying_contract"].(string)
	signatureChainId := provenanceRecord["chain_id"].(float64)
	signatureCid := provenanceMessageCid
	signatureR := "0x" + signature[2:66]
	signatureS := "0x" + signature[66:130]
	signatureV, signatureVErr := strconv.ParseUint(signature[130:132], 16, 16)
	if signatureVErr != nil {
		return
	}

	// Add provenance message metadata to the database
	provenanceStatement := "insert into co2_storage_scraper.contents (\"chain_name\", \"data_structure\", \"version\", \"cid\", \"name\", \"description\", \"reference\", \"creator\", \"protocol\", \"license\", \"timestamp\", \"signature\", \"signature_method\", \"signature_account\", \"signature_verifying_contract\", \"signature_chain_id\", \"signature_cid\", \"signature_v\", \"signature_r\", \"signature_s\") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12, $13, $14, $15, $16, $17, $18, $19, $20);"
	_, provenanceStatementErr := db.Exec(context.Background(), provenanceStatement, chain, "provenance", version, cid, name, description, reference, creator, protocol, license, timestamp,
		signature, signatureMethod, signatureAccount, signatureVerifyingContract, fmt.Sprintf("%f", signatureChainId), signatureCid, signatureV, signatureR, signatureS)

	if provenanceStatementErr != nil {
		return
	}
}
