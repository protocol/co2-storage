package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/adgsm/co2-storage-pinning/helpers"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
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

	// instantiate cron
	crn := cron.New()

	crn.AddFunc(config["try_pinning_every"], func() {
		unpinned, err := pinningList(db)
		if err == nil {
			pin(db, unpinned)
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

// declare response type
type PinningList struct {
	Service string
	Cid     string
	Name    helpers.NullString
}

func pinningList(db *pgxpool.Pool) (pinnningList []PinningList, err error) {
	// search through scraped content
	rows, rowsErr := db.Query(context.Background(), "select \"service\", \"cid\", \"name\" from co2_storage_api.pins where pinned is null order by \"timestamp\" desc;")

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "error occured whilst retrieving unpinned list"
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}

	defer rows.Close()

	respList := []PinningList{}

	for rows.Next() {
		var resp PinningList
		if respsErr := rows.Scan(&resp.Service, &resp.Cid, &resp.Name); respsErr != nil {
			message := fmt.Sprintf("error occured whilst scaning pins response (%s)", respsErr.Error())
			helpers.WriteLog("error", message, "pinning")
			return nil, errors.New(message)
		}
		respList = append(respList, resp)
	}

	updateStatement := "update co2_storage_api.pins set \"pinned\" = false where \"pinned\" is null;"
	_, updateStatementErr := db.Exec(context.Background(), updateStatement)

	if updateStatementErr != nil {
		return nil, errors.New(updateStatementErr.Error())
	}

	return respList, nil
}

func pin(db *pgxpool.Pool, unpinned []PinningList) {
	client, clientErr := helpers.HttpClient()
	if clientErr != nil {
		helpers.WriteLog("error", fmt.Sprintf("URL %s is unreachable.", clientErr.Error()), "pinning")
	}

	for _, pin := range unpinned {
		switch service := pin.Service; service {
		case "estuary":
			url := "https://api.estuary.tech/pinning/pins"
			jsonData := map[string]string{"cid": pin.Cid, "name": pin.Name.String}
			jsonValue, jsonValueErr := json.Marshal(jsonData)
			if jsonValueErr != nil {
				helpers.WriteLog("error", fmt.Sprintf("Can not marshal %s.", jsonData), "pinning")
				continue
			}
			request, requestErr := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
			if requestErr != nil {
				helpers.WriteLog("error", requestErr.Error(), "pinning")
				continue
			}
			request.Header.Set("Content-Type", "application/json; charset=UTF-8")
			request.Header.Set("Accept", "application/json")
			request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", goDotEnvVariable("ESTUARY_API_KEY")))

			response, responseErr := client.Do(request)
			if responseErr != nil {
				helpers.WriteLog("error", responseErr.Error(), "pinning")
				continue
			}

			defer response.Body.Close()

			b, bErr := io.ReadAll(response.Body)
			if bErr != nil {
				helpers.WriteLog("error", bErr.Error(), "pinning")
			}

			if response.StatusCode > 299 {
				helpers.WriteLog("error", string(b), "pinning")
				continue
			}
			helpers.WriteLog("info", string(b), "pinning")

			updateStatement := "update co2_storage_api.pins set \"pinned\" = true where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully pinned to %s.", pin.Cid, pin.Service), "pinning")
		default:
			helpers.WriteLog("error", fmt.Sprintf("Unknown pinning service provider %s.", service), "pinning")
		}
	}
}
