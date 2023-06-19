/*
* Function container: ipfs://QmYYeZRmE2kTSeSRHMGbjscMkQZamrqh4D1sbHnqKa8Pz7
* Function input type: ipfs://bafyreibsepugojfombbyqvm5apsmpn4g6zb525q2uoibtsep6idrbdxxou
* Function output type: ipfs://bafyreidrl5wvz3zj3e4hdygjllepnn4t3gw5hoiaaope4qpxbiowv7aopa
 */

package main

import (
	"encoding/json"
	"fmt"
	"os"
)

/*
Emissions calculations are based on the following model
https://docs.google.com/spreadsheets/d/1thLhacDWWOpC4Nf21FBoGvihVUMPmTUAbili-1ZysSk/edit#gid=0
*/

// Source: https://www.epa.gov/system/files/documents/2023-05/420f23014.pdf
const DRIVING_EMISSIONS_AVERAGE_INTENSITY = 400.00 // g/mile

// Source https://theicct.org/wp-content/uploads/2021/06/ICCT_CO2-commercl-aviation-2018_20190918.pdf
const FLYING_EMISSIONS_AVERAGE_INTENSITY_LOW_MILES = 251.0576609  // g/mile
const FLYING_EMISSIONS_AVERAGE_INTENSITY_HIGH_MILES = 136.7942383 // g/mile
const LOW_DISTANCE_BOUNDARY = 609.5651472                         // miles

type AttendeeNameStruct struct {
	AttendeeName string `json:"Attendee Name"`
}

type EventStruct struct {
	Event string `json:"Event"`
}

type StartDateStruct struct {
	StartDate string `json:"Start Date"`
}

type EndDateStruct struct {
	EndDate string `json:"End Date"`
}

type TravelDescriptionStruct struct {
	TravelDescription string `json:"Travel Description"`
}

type OneWayDrivingDistanceStruct struct {
	OneWayDrivingDistance float32 `json:"One-way Driving Distance (miles)"`
}

type OneWayFlyingDistanceStruct struct {
	OneWayFlyingDistance float32 `json:"One-way Flying Distance (miles)"`
}

type OffsetChainStruct struct {
	OffsetChain string `json:"Offset Chain"`
}

type OffsetAmountStruct struct {
	OffsetAmount int `json:"Offset Amount (kg CO2e)"`
}

type EmissionsDescriptionStruct struct {
	EmissionsDescription string `json:"Emissions Description"`
}

type OffsetTransactionHashStruct struct {
	OffsetTransactionHash string `json:"Offset Transaction Hash"`
}

// Declare input type
type Asset []struct {
	AttendeeNameStruct
	EventStruct
	StartDateStruct
	EndDateStruct
	TravelDescriptionStruct
	OneWayDrivingDistanceStruct
	OneWayFlyingDistanceStruct
	OffsetChainStruct
	OffsetAmountStruct
	EmissionsDescriptionStruct
	OffsetTransactionHashStruct
}

// Declare output type
type EmissionsResponse struct {
	AttendeeNameStruct
	EventStruct
	StartDateStruct
	EndDateStruct
	TravelDescriptionStruct
	OneWayDrivingDistanceStruct
	OneWayFlyingDistanceStruct
	OffsetChainStruct
	OffsetAmountStruct
	EmissionsDescriptionStruct
	OffsetTransactionHashStruct
	DrivingEmissions float32 `json:"Driving Emissions (kg CO2)"`
	FlyingEmissions  float32 `json:"Flying Emissions (kg CO2)"`
	TotalEmissions   float32 `json:"Total Emissions (kg CO2)"`
	NetZero          bool    `json:"Net Zero"`
}

var asset Asset
var emissionsRsponse EmissionsResponse
var valid = false

func main() {
	entries, err := os.ReadDir("/inputs")
	if err != nil {
		os.Stderr.WriteString(fmt.Sprintf("%s\n", err.Error()))
		os.Exit(1)
	}

	for _, e := range entries {
		entryName := e.Name()

		// Check if this entry is the asset data
		if entryName == "asset" {
			// Parse asset data
			assetByteValue, assetByteValueErr := os.ReadFile(fmt.Sprintf("/inputs/%s", entryName))
			if assetByteValueErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", assetByteValueErr.Error()))
				os.Exit(3)
			}

			assetErr := json.Unmarshal(assetByteValue, &asset)
			if assetErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", assetErr.Error()))
				os.Exit(4)
			}

			// Copy inputs into a response
			emissionsRsponse.AttendeeNameStruct = asset[0].AttendeeNameStruct
			emissionsRsponse.EventStruct = asset[1].EventStruct
			emissionsRsponse.StartDateStruct = asset[2].StartDateStruct
			emissionsRsponse.EndDateStruct = asset[3].EndDateStruct
			emissionsRsponse.TravelDescriptionStruct = asset[4].TravelDescriptionStruct
			emissionsRsponse.OneWayDrivingDistanceStruct = asset[5].OneWayDrivingDistanceStruct
			emissionsRsponse.OneWayFlyingDistanceStruct = asset[6].OneWayFlyingDistanceStruct
			emissionsRsponse.OffsetChainStruct = asset[7].OffsetChainStruct
			emissionsRsponse.OffsetAmountStruct = asset[8].OffsetAmountStruct
			emissionsRsponse.EmissionsDescriptionStruct = asset[9].EmissionsDescriptionStruct
			emissionsRsponse.OffsetTransactionHashStruct = asset[10].OffsetTransactionHashStruct

			if asset[7].OffsetChainStruct.OffsetChain == "" {
				message := "Offset chain must be specified"
				os.Stderr.WriteString(fmt.Sprintf("%s\n", message))
				os.Exit(5)
			}

			if asset[10].OffsetTransactionHashStruct.OffsetTransactionHash == "" {
				message := "Offset transaction must be specified"
				os.Stderr.WriteString(fmt.Sprintf("%s\n", message))
				os.Exit(6)
			}

			// Calculate total emissions
			emissions := calculateEmissions(asset)

			// Check if offset guarantee net zero emissions
			netZero := checkNetZero(asset, emissions)

			if netZero {
				message := "Travel is NET ZERO!"
				os.Stdout.WriteString(fmt.Sprintf("%s\n", message))
			} else {
				message := "Travel is NOT net zero!"
				os.Stdout.WriteString(fmt.Sprintf("%s\n", message))
			}

			emissionsRsponse.NetZero = netZero

			// Create output
			outputFile, outputFileErr := json.Marshal(emissionsRsponse)
			if outputFileErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", outputFileErr.Error()))
				os.Exit(7)
			}
			fileWriteErr := os.WriteFile("/outputs/travel-emissions.json", outputFile, 0644)
			if fileWriteErr != nil {
				os.Stderr.WriteString(fmt.Sprintf("%s\n", fileWriteErr.Error()))
				os.Exit(8)
			}

			// Set valid flag
			valid = true
		}
	}
	if !valid {
		message := "Could not find valid input file!"
		os.Stderr.WriteString(fmt.Sprintf("%s\n", message))
		os.Exit(2)
	}

	os.Stdout.WriteString("Done\n")
	os.Exit(0)
}

func calculateEmissions(asset Asset) float32 {
	var drivingEmissions float32 = 0.00
	var flyingEmissions float32 = 0.00
	var totalEmissions float32 = 0.00

	// Check input parameters
	oneWayDrivingDistance := asset[5].OneWayDrivingDistance
	oneWayFlyingDistance := asset[6].OneWayFlyingDistance
	if oneWayDrivingDistance <= 0 && oneWayFlyingDistance <= 0 {
		message := "Either One way driving distance or One way flying distance (or both) must be greater than zero!"
		os.Stderr.WriteString(fmt.Sprintf("%s\n", message))
		os.Exit(1)
	}

	// Calculate driving emissions
	if oneWayDrivingDistance > 0 {
		drivingEmissions = (oneWayDrivingDistance * 2 * DRIVING_EMISSIONS_AVERAGE_INTENSITY) / 1000
	}

	// Calculate driving emissions
	if oneWayFlyingDistance > 0 {
		if oneWayFlyingDistance <= LOW_DISTANCE_BOUNDARY {
			flyingEmissions = (oneWayFlyingDistance * 2 * FLYING_EMISSIONS_AVERAGE_INTENSITY_LOW_MILES) / 1000
		} else {
			flyingEmissions = (oneWayFlyingDistance * 2 * FLYING_EMISSIONS_AVERAGE_INTENSITY_HIGH_MILES) / 1000
		}
	}

	// Calculate total emissions
	totalEmissions = drivingEmissions + flyingEmissions

	// Populate response object
	emissionsRsponse.DrivingEmissions = drivingEmissions
	emissionsRsponse.FlyingEmissions = flyingEmissions
	emissionsRsponse.TotalEmissions = totalEmissions

	return totalEmissions
}

func checkNetZero(asset Asset, emissions float32) bool {
	if emissions <= float32(asset[8].OffsetAmount) {
		return true
	} else {
		return false
	}
}
