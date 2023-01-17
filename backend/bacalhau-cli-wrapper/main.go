package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"

	"github.com/adgsm/co2-storage-bacalhau-cli-wrapper/helpers"
	"github.com/joho/godotenv"
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

	// Collect input vars
	inputs, image, argsErr := parseArgs()
	if argsErr != nil {
		helpers.WriteLog("error", argsErr.Error(), "bacalhau-cli-wrapper")
		os.Exit(1)
	}

	helpers.WriteLog("info", fmt.Sprintf("inputs %s, image %s", inputs, image), "bacalhau-cli-wrapper")

	runBacalhauCommand(inputs, image)
}

// Collect and parse args
func parseArgs() (inputs string, image string, bad error) {
	args := os.Args[1:]
	if len(args) < 2 {
		return "", "", errors.New("program needs two input parameters, the inputs URL and docker image")
	}

	return args[0], args[1], nil
}

func runBacalhauCommand(inputs string, image string) {
	var stdoutBuf, stderrBuf bytes.Buffer
	cmd := exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run --id-only --wait --input-urls=%s %s", inputs, image))
	cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	err := cmd.Run()
	if err != nil {
		helpers.WriteLog("error", fmt.Sprintf("cmd.Run() failed with %s", err), "bacalhau-cli-wrapper")
		os.Exit(1)
	}
	outStr, errStr := stdoutBuf.String(), stderrBuf.String()
	helpers.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStr, errStr), "bacalhau-cli-wrapper")
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
