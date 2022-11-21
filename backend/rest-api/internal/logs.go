package internal

import (
	"os"

	log "github.com/sirupsen/logrus"
)

func WriteLog(level string, message string, category string) {
	// provide configs file path
	confsPath := "configs/configs"

	// init config
	config := Config{
		"file": confsPath,
	}

	// read configs
	config, rcerr := ReadConfigs(confsPath)

	if rcerr != nil {
		panic(rcerr)
	}

	// open log file
	file, logerr := os.OpenFile(config["logfile"], os.O_APPEND|os.O_CREATE|os.O_RDWR, 0666)
	if logerr != nil {
		panic(logerr)
	}
	defer file.Close()

	// set log output to log file
	log.SetOutput(file)

	// set formatter
	log.SetFormatter(&log.JSONFormatter{})

	// log message into a log file
	switch level {
	case "trace":
		log.WithFields(log.Fields{
			"category": category,
		}).Trace(message)
	case "debug":
		log.WithFields(log.Fields{
			"category": category,
		}).Debug(message)
	case "info":
		log.WithFields(log.Fields{
			"category": category,
		}).Info(message)
	case "warn":
		log.WithFields(log.Fields{
			"category": category,
		}).Warn(message)
	case "error":
		log.WithFields(log.Fields{
			"category": category,
		}).Error(message)
	case "fatal":
		log.WithFields(log.Fields{
			"category": category,
		}).Fatal(message)
	case "panic":
		log.WithFields(log.Fields{
			"category": category,
		}).Panic(message)
	default:
		log.WithFields(log.Fields{
			"category": category,
		}).Info(message)
	}
}
