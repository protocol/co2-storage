package internal

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v4/log/logrusadapter"
	"github.com/jackc/pgx/v4/pgxpool"
	log "github.com/sirupsen/logrus"
)

func DbInit(host string, port int, user string,
	password string, dbname string) (*pgxpool.Pool, error) {
	psqlconn := fmt.Sprintf("postgres://%s:%s@%s:%d/%s", user, password, host, port, dbname)

	// provide configs file path
	confsPath := "configs/configs"

	// init config
	confs := Config{
		"file": confsPath,
	}

	// read configs
	confs, rcerr := ReadConfigs(confsPath)

	if rcerr != nil {
		panic(rcerr)
	}

	// open log file
	logFile, logErr := os.OpenFile(confs["logfile"], os.O_APPEND|os.O_CREATE|os.O_RDWR, 0666)
	if logErr != nil {
		fmt.Fprintf(os.Stderr, "Unable to opent log file: %v\n", logErr)
		os.Exit(1)
	}

	pgxPoolConfig, pgxPoolConfigErr := pgxpool.ParseConfig(psqlconn)
	if pgxPoolConfigErr != nil {
		fmt.Fprintf(os.Stderr, "Unable to parse pgxPoolConfig: %v\n", pgxPoolConfigErr)
		os.Exit(1)
	}

	logger := &log.Logger{
		Out:          logFile,
		Formatter:    new(log.JSONFormatter),
		Hooks:        make(log.LevelHooks),
		Level:        log.InfoLevel,
		ExitFunc:     os.Exit,
		ReportCaller: false,
	}

	pgxPoolConfig.ConnConfig.Logger = logrusadapter.NewLogger(logger)

	db, err := pgxpool.ConnectConfig(context.Background(), pgxPoolConfig)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}

	return db, nil
}
