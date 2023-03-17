package main

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/adgsm/co2-storage-rest-api/api"
	"github.com/adgsm/co2-storage-rest-api/internal"
	"github.com/joho/godotenv"
)

func main() {
	// provide configs file path
	confsPath := "configs/configs"

	// read configs
	config, rcerr := internal.ReadConfigs(confsPath)

	if rcerr != nil {
		panic(rcerr)
	}

	// cast port to int
	port, atoierr := strconv.Atoi(config["postgresql_port"])

	if atoierr != nil {
		panic(atoierr)
	}

	// init db connection
	db, dberr := internal.DbInit(config["postgresql_host"], port,
		config["postgresql_user"], goDotEnvVariable(config["postgresql_password"]), config["postgresql_database"])

	if dberr != nil {
		panic(dberr)
	}

	// close db connections
	// when func closes
	defer db.Close()

	// start API
	a := api.New(db, goDotEnvVariable(config["rpc_provider"]))
	//	log.Fatal(http.ListenAndServeTLS(":"+config["api_port"], config["tsl_cert"], config["tsl_key"], a))
	log.Fatal(http.ListenAndServe(":"+config["api_port"], a))
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
