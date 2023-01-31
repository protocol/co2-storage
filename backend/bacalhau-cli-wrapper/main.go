package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"

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

	// Collect input args
	job, inputs, argsErr := parseArgs()
	if argsErr != nil {
		helpers.WriteLog("error", argsErr.Error(), "bacalhau-cli-wrapper")
		os.Exit(1)
	}

	helpers.WriteLog("info", fmt.Sprintf("job %s, inputs %s", job, strings.Join(inputs, ", ")), "bacalhau-cli-wrapper")

	runBacalhauJob(job, inputs)
}

// Collect and parse args
func parseArgs() (job string, inputs []string, bad error) {
	args := os.Args[1:]
	if len(args) < 2 {
		return "", nil, errors.New("program needs two input parameters following the program name")
	}

	return args[0], args[1:], nil
}

func runBacalhauJob(job string, inputs []string) {
	var stdoutBuf, stderrBuf bytes.Buffer
	for i, input := range inputs {
		inputs[i] = strings.ReplaceAll(input, ";", "")
	}
	for _, input := range inputs {
		helpers.WriteLog("info", fmt.Sprintf("input %s", input), "bacalhau-cli-wrapper")
	}

	var cmd *exec.Cmd
	switch job {
	case "url-data":
	case "url-dataset":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run --id-only --wait --ipfs-swarm-addrs=/dns4/co2.storage/tcp/5002/https --input-urls=%s %s", inputs[0], inputs[1]))
	case "custom-docker-job-with-url-inputs":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run --id-only --wait --ipfs-swarm-addrs=/dns4/co2.storage/tcp/5002/https --input-urls=%s %s %s", inputs[0], inputs[1], inputs[2]))
	case "custom-docker-job-with-cid-inputs":
		cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau docker run --id-only --wait --ipfs-swarm-addrs=/dns4/co2.storage/tcp/5002/https --inputs=%s %s %s", inputs[0], inputs[1], inputs[2]))
	default:
		helpers.WriteLog("error", fmt.Sprintf("Unknown job type %s", job), "bacalhau-cli-wrapper")
		os.Exit(1)
	}
	cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	err := cmd.Run()
	if err != nil {
		helpers.WriteLog("error", fmt.Sprintf("cmd.Run() failed with %s", err), "bacalhau-cli-wrapper")
		os.Exit(1)
	}
	outStr, errStr := strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
	helpers.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStr, errStr), "bacalhau-cli-wrapper")

	if errStr != "" {
		helpers.WriteLog("error", fmt.Sprintf("Bacalhau job failed with %s", errStr), "bacalhau-cli-wrapper")
		os.Exit(1)
	}

	stdoutBuf.Reset()
	stderrBuf.Reset()
	cmd = exec.Command("sh", "-c", fmt.Sprintf("bacalhau list --id-filter=%s --output=json | jq -r '.[0].Status.JobState.Nodes[] | .Shards.\"0\".PublishedResults | select(.CID) | .CID'", outStr))
	cmd.Stdout = io.MultiWriter(os.Stdout, &stdoutBuf)
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)
	err = cmd.Run()
	if err != nil {
		helpers.WriteLog("error", fmt.Sprintf("cmd.Run() failed with %s", err), "bacalhau-cli-wrapper")
		os.Exit(1)
	}
	outStr, errStr = strings.TrimSuffix(stdoutBuf.String(), "\n"), stderrBuf.String()
	helpers.WriteLog("info", fmt.Sprintf("out: %s, err: %s", outStr, errStr), "bacalhau-cli-wrapper")

	if errStr != "" {
		helpers.WriteLog("error", fmt.Sprintf("Listing Bacalhau job failed with %s", errStr), "bacalhau-cli-wrapper")
		os.Exit(1)
	}
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
