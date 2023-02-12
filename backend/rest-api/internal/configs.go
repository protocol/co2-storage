package internal

import (
	"bufio"
	"io"
	"os"
	"strings"
)

type Config map[string]string

func ReadConfigs(path string) (Config, error) {
	// init config
	config := Config{
		"file": path,
	}

	// return error if config filepath is not provided
	if len(path) == 0 {
		return config, nil
	}

	// open configs file
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// instatiate new reader
	reader := bufio.NewReader(file)

	// parse through config file
	for {
		line, err := reader.ReadString('\n')

		// check line for '=' delimiter
		if equal := strings.Index(line, "="); equal >= 0 {
			// extract key
			if key := strings.TrimSpace(line[:equal]); len(key) > 0 {
				// init value
				value := ""
				if len(line) > equal {
					// assign value if not empty
					value = strings.TrimSpace(line[equal+1:])
				}

				// assign the config map
				config[key] = value
			}
		}

		// process errors
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
	}

	return config, nil
}
