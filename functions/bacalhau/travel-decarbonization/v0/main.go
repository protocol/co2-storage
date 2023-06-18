package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Asset []struct {
	AttendeeName          string  `json:"Attendee Name"`
	Event                 string  `json:"Event"`
	StartDate             string  `json:"Start Date"`
	EndDate               string  `json:"End Date"`
	TravelDescription     string  `json:"Travel Description"`
	OneWayDrivingDistance float32 `json:"One-way Driving Distance (miles)"`
	OneWayFlyingDistance  float32 `json:"One-way Flying Distance (miles)"`
	OffsetChain           string  `json:"Offset Chain"`
	OffsetAmount          int     `json:"Offset Amount (kg CO2e)"`
	EmissionsDescription  string  `json:"Emissions Description"`
	OffsetTransactionHash string  `json:"Offset Transaction Hash"`
}

var asset Asset

func main() {

	entries, err := os.ReadDir("/inputs")
	if err != nil {
		os.Stderr.WriteString(fmt.Sprintf("%s\n", err.Error()))
		os.Exit(1)
	}

	for _, e := range entries {
		entryName := e.Name()
		os.Stdout.WriteString(fmt.Sprintf("%s\n", entryName))

		// Check if this entry is the asset data
		if entryName == "asset" {
			// Parse asset data
			assetByteValue, assetByteValueErr := os.ReadFile(fmt.Sprintf("/inputs/%s", entryName))
			if assetByteValueErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", assetByteValueErr.Error()))
				os.Exit(1)
			}

			assetErr := json.Unmarshal(assetByteValue, &asset)
			if assetErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", assetErr.Error()))
				os.Exit(1)
			}

			os.Stdout.WriteString(fmt.Sprintf("%s\n", asset[0].AttendeeName))
		}
	}
	os.Stdout.WriteString("Done\n")
	os.Exit(0)
}
