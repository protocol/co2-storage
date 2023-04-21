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
	"strings"

	"github.com/adgsm/co2-storage-pinning/helpers"
	CID "github.com/ipfs/go-cid"
	shell "github.com/ipfs/go-ipfs-http-client"
	"github.com/ipfs/interface-go-ipfs-core/options"
	"github.com/ipfs/interface-go-ipfs-core/path"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"github.com/multiformats/go-multiaddr"
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
			sh, shErr := initShell(config)
			if shErr == nil {
				pin(db, sh, unpinned)
			}
		}
	})

	crn.AddFunc(config["check_pinning_nodes"], func() {
		pinsWithoutNodes, err := checkPinsWithoutNodes(db)
		if err == nil {
			sh, shErr := initShell(config)
			if shErr == nil {
				findProviders(db, sh, config, pinsWithoutNodes)
			}
		}
	})

	crn.AddFunc(config["calculate_pin_size"], func() {
		pinsWithoutCalculatedSize, err := findPinsWithoutCalculatedSize(db)
		if err == nil {
			sh, shErr := initShell(config)
			if shErr == nil {
				calculateSize(db, sh, pinsWithoutCalculatedSize)
			}
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

	return respList, nil
}

func pin(db *pgxpool.Pool, sh *shell.HttpApi, unpinned []PinningList) {
	client, clientErr := helpers.HttpClient()
	if clientErr != nil {
		helpers.WriteLog("error", fmt.Sprintf("URL %s is unreachable.", clientErr.Error()), "pinning")
	}

	for _, pin := range unpinned {
		switch service := pin.Service; service {
		case "estuary":
			updateStatement := "update co2_storage_api.pins set \"pinned\" = false where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully marked for pinning at %s.", pin.Cid, pin.Service), "pinning")

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

			updateStatement = "update co2_storage_api.pins set \"pinned\" = true where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr = db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully pinned to %s.", pin.Cid, pin.Service), "pinning")
		case "filecoin-green":
			updateStatement := "update co2_storage_api.pins set \"pinned\" = false where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully marked for pinning at %s.", pin.Cid, pin.Service), "pinning")

			var addOpts []options.PinAddOption
			addErr := sh.Pin().Add(context.Background(), path.New(pin.Cid), addOpts...)
			if addErr != nil {
				helpers.WriteLog("error", addErr.Error(), "pinning")
				updateStatement := "update co2_storage_api.pins set \"pinned\" = null where \"service\" = $1 and \"cid\" = $2;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)
				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				return
			}

			updateStatement = "update co2_storage_api.pins set \"pinned\" = true where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr = db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully pinned to %s.", pin.Cid, pin.Service), "pinning")
		case "bacalhau-job":
			updateStatement := "update co2_storage_api.pins set \"pinned\" = false where \"service\" = $1 and \"cid\" = $2;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("CID %s successfully marked for pinning at %s.", pin.Cid, pin.Service), "pinning")

			// declare response type
			type JobAssetResp struct {
				Cid      string
				Name     string
				AssetCid helpers.NullString
			}

			jobAssetResult := db.QueryRow(context.Background(), "select p.cid, p.name, (select c.cid from co2_storage_scraper.contents c where c.content like '%' || p.name || '%' ) as asset_cid from co2_storage_api.pins p where p.service = $1 and p.cid = $2 and (p.pinned is null or p.pinned = false);",
				pin.Service, pin.Cid)

			var jobAssetResp JobAssetResp
			if jobAssetRespErr := jobAssetResult.Scan(&jobAssetResp.Cid, &jobAssetResp.Name, &jobAssetResp.AssetCid); jobAssetRespErr != nil {
				message := fmt.Sprintf("Error occured whilst searching asset CID for Bacalhau job CID %s (%s)", pin.Cid, jobAssetRespErr.Error())
				helpers.WriteLog("error", message, "api")
			}

			if jobAssetResp.AssetCid.Valid {
				// TODO, create data transformation pipeline IPLD structure and pin data
				var addOpts []options.PinAddOption
				addErr := sh.Pin().Add(context.Background(), path.New(pin.Cid), addOpts...)
				if addErr != nil {
					helpers.WriteLog("error", addErr.Error(), "pinning")
					updateStatement := "update co2_storage_api.pins set \"pinned\" = null where \"service\" = $1 and \"cid\" = $2;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)
					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}
				}

				updateStatement = "update co2_storage_api.pins set \"pinned\" = true where \"service\" = $1 and \"cid\" = $2;"
				_, updateStatementErr = db.Exec(context.Background(), updateStatement, pin.Service, pin.Cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				helpers.WriteLog("info", fmt.Sprintf("CID %s successfully pinned to %s.", pin.Cid, pin.Service), "pinning")
			} else {
				message := fmt.Sprintf("Asset CID for Bacalhau job CID %s is not found. Bacalhau job is most probably ended unsuccessfully.", pin.Cid)
				helpers.WriteLog("error", message, "api")
			}
		default:
			helpers.WriteLog("error", fmt.Sprintf("Unknown pinning service provider %s.", service), "pinning")
		}
	}
}

func checkPinsWithoutNodes(db *pgxpool.Pool) (cids []string, err error) {
	// search through scraped content and look for non-archived
	// CIDs where pinning IPFS nodes list is empty
	//	rows, rowsErr := db.Query(context.Background(), "select \"cid\" from co2_storage_scraper.contents where archive is null and (ipfs_nodes is null or array_length(ipfs_nodes, 1) is null or array_length(ipfs_nodes, 1) = 0) and data_structure = 'asset' order by \"id\" asc;")
	rows, rowsErr := db.Query(context.Background(), "select \"cid\" from co2_storage_scraper.contents where archive is null and (ipfs_nodes is null or array_length(ipfs_nodes, 1) is null or array_length(ipfs_nodes, 1) = 0) order by \"id\" asc;")

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "error occured whilst retrieving list of pinned CIDs without info about pinning nodes"
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}

	updateStatement := "update co2_storage_scraper.contents set \"archive\" = false where archive is null and (ipfs_nodes is null or array_length(ipfs_nodes, 1) is null or array_length(ipfs_nodes, 1) = 0);"
	_, updateStatementErr := db.Exec(context.Background(), updateStatement)

	if updateStatementErr != nil {
		helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
	}

	defer rows.Close()

	respList := []string{}

	for rows.Next() {
		var resp string
		if respsErr := rows.Scan(&resp); respsErr != nil {
			message := fmt.Sprintf("error occured whilst scaning cids response (%s)", respsErr.Error())
			helpers.WriteLog("error", message, "pinning")
			return nil, errors.New(message)
		}
		respList = append(respList, resp)
	}

	return respList, nil
}

func findProviders(db *pgxpool.Pool, sh *shell.HttpApi, config helpers.Config, cids []string) {
	for _, cid := range cids {
		// Find providers where this CID is pinned
		_, cerr := CID.Parse(cid)
		if cerr != nil {
			message := fmt.Sprintf("%s is not valid CID. (%s)", cid, cerr.Error())
			helpers.WriteLog("error", message, "pinning")
			continue
		}

		var pinOpts []options.PinIsPinnedOption
		pinnedStr, pinned, pinnedErr := sh.Pin().IsPinned(context.Background(), path.New(cid), pinOpts...)
		if pinnedErr != nil {
			message := fmt.Sprintf("Error occured whilst checking if CID %s is pinned. (%s)", cid, pinnedErr.Error())
			helpers.WriteLog("error", message, "pinning")
		}
		helpers.WriteLog("info", fmt.Sprintf("%s: %t", pinnedStr, pinned), "pinning")

		var providerList []string
		if pinned {
			providerList = append(providerList, config["ipfs_node_id"])
			providerArr := pq.Array(providerList)

			updateStatement := "update co2_storage_scraper.contents set \"ipfs_nodes\" = $1 where \"cid\" = $2;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, providerArr, cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("Providers %s set for CID %s.", strings.Join(providerList, ", "), cid), "pinning")
		} else {
			var dhtOpts []options.DhtFindProvidersOption
			providers, providersErr := sh.Dht().FindProviders(context.Background(), path.New(cid), dhtOpts...)
			if providersErr != nil {
				message := fmt.Sprintf("Could not find providers for CID %s. (%s)", cid, providersErr.Error())
				helpers.WriteLog("error", message, "pinning")

				updateStatement := "update co2_storage_scraper.contents set \"archive\" = null where \"cid\" = $1;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				return
			}

			for provider := range providers {
				helpers.WriteLog("info", fmt.Sprintf("Provider %s added to list of providers for CID %s.", provider.ID.Pretty(), cid), "pinning")
				providerList = append(providerList, provider.ID.Pretty())
			}

			if len(providerList) > 0 {
				providerArr := pq.Array(providerList)

				updateStatement := "update co2_storage_scraper.contents set \"ipfs_nodes\" = $1 where \"cid\" = $2;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, providerArr, cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				helpers.WriteLog("info", fmt.Sprintf("Providers %s set for CID %s.", strings.Join(providerList, ", "), cid), "pinning")
			} else {
				updateStatement := "update co2_storage_scraper.contents set \"archive\" = null where \"cid\" = $1;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				helpers.WriteLog("info", fmt.Sprintf("Can not find providers for pinned CID %s.", cid), "pinning")
			}
		}
	}
}

// declare response type
type Content struct {
	Cid           string
	DataStructure string
	Version       helpers.NullString
}

func initShell(config helpers.Config) (*shell.HttpApi, error) {
	ipfsNode := config["ipfs_node_addr"]
	multiAddr, multiAddrErr := multiaddr.NewMultiaddr(ipfsNode)
	if multiAddrErr != nil {
		message := fmt.Sprintf("%s is not valid multiaddr.", ipfsNode)
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}
	sh, shErr := shell.NewApi(multiAddr)
	if shErr != nil {
		message := fmt.Sprintf("Can not initiate new IPFS client api. (%s)", shErr.Error())
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}

	localAddrs, localAddrsErr := sh.Swarm().LocalAddrs(context.Background())
	if localAddrsErr != nil {
		message := fmt.Sprintf("Can not obtain IPFS localaddresses. (%s)", localAddrsErr.Error())
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}
	for _, addr := range localAddrs {
		message := fmt.Sprintf("Listening at %s.", addr.String())
		helpers.WriteLog("info", message, "pinning")
	}

	return sh, nil
}

func findPinsWithoutCalculatedSize(db *pgxpool.Pool) (contents []Content, err error) {
	// search through scraped content and look for
	// CIDs where size is not calculated yet
	rows, rowsErr := db.Query(context.Background(), "select \"cid\", \"data_structure\", \"version\" from co2_storage_scraper.contents where size is null order by \"id\" asc;")

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "error occured whilst retrieving list of pins without calculated size"
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
	}

	defer rows.Close()

	respList := []Content{}

	for rows.Next() {
		var resp Content
		if respsErr := rows.Scan(&resp.Cid, &resp.DataStructure, &resp.Version); respsErr != nil {
			message := fmt.Sprintf("error occured whilst scaning cids response (%s)", respsErr.Error())
			helpers.WriteLog("error", message, "pinning")
			return nil, errors.New(message)
		}
		respList = append(respList, resp)
	}

	return respList, nil
}

func calculateSize(db *pgxpool.Pool, sh *shell.HttpApi, contents []Content) {
	for _, content := range contents {
		cid, cidErr := CID.Parse(content.Cid)
		if cidErr != nil {
			message := fmt.Sprintf("%s is not valid CID. (%s)", content.Cid, cidErr.Error())
			helpers.WriteLog("error", message, "pinning")
			continue
		}

		var version string

		if !content.Version.Valid {
			version = "1.0.0"
		} else {
			version = content.Version.String
		}

		updateStatement := "update co2_storage_scraper.contents set \"size\" = 0 where \"cid\" = $1;"
		_, updateStatementErr := db.Exec(context.Background(), updateStatement, cid.String())

		if updateStatementErr != nil {
			helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
		}
		helpers.WriteLog("info", fmt.Sprintf("Pinned CID %s, type %s, version %s marked \"in progress of calculating size of it DAG structure\".",
			cid.String(), content.DataStructure, version), "pinning")

		dagBlock, dagBlockErr := sh.Dag().Get(context.Background(), cid)
		if dagBlockErr != nil {
			message := fmt.Sprintf("Error occured whilst reading DAG block. (%s)", dagBlockErr.Error())
			helpers.WriteLog("error", message, "pinning")

			updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			continue
		}

		dagBlockSize, dagBlockSizeErr := dagBlock.Size()
		if dagBlockSizeErr != nil {
			helpers.WriteLog("error", dagBlockSizeErr.Error(), "pinning")
		}
		helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagBlockSize), "pinning")

		switch content.DataStructure {
		case "template":
			var size uint64 = dagBlockSize
			switch version {
			case "1.0.0", "1.0.1":
				templateCidStr, _, templateCidStrErr := dagBlock.Resolve([]string{"cid"})
				if templateCidStrErr != nil {
					helpers.WriteLog("error", templateCidStrErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				if _, ok := templateCidStr.(string); !ok {
					helpers.WriteLog("error", fmt.Sprintf("Template %s CID field type: %v", content.Cid, templateCidStr), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				templateCid, templateCidErr := CID.Parse(templateCidStr)
				if templateCidErr != nil {
					message := fmt.Sprintf("%s is not valid CID. (%s)", templateCidStr, templateCidErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagTemplate, dagTemplateErr := sh.Dag().Get(context.Background(), templateCid)
				if dagTemplateErr != nil {
					message := fmt.Sprintf("Error occured whilst reading template DAG. (%s)", dagTemplateErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagTemplateSize, dagTemplateSizeErr := dagTemplate.Size()
				if dagTemplateSizeErr != nil {
					helpers.WriteLog("error", dagTemplateSizeErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagTemplateSize), "pinning")

				size += dagTemplateSize

				updateStatement := "update co2_storage_scraper.contents set \"size\" = $1 where \"cid\" = $2;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, size, content.Cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
			default:
				message := fmt.Sprintf("%s is not valid template version.", version)
				helpers.WriteLog("error", message, "pinning")

				updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				continue
			}
		case "asset":
			var size uint64 = dagBlockSize
			switch version {
			case "1.0.0":
				assetCidStr, _, assetCidStrErr := dagBlock.Resolve([]string{"cid"})
				if assetCidStrErr != nil {
					helpers.WriteLog("error", assetCidStrErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				if _, ok := assetCidStr.(string); !ok {
					helpers.WriteLog("error", fmt.Sprintf("Asset %s CID field type: %v", content.Cid, assetCidStr), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				assetCid, assetCidErr := CID.Parse(assetCidStr)
				if assetCidErr != nil {
					message := fmt.Sprintf("%s is not valid CID. (%s)", assetCidStr, assetCidErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagAsset, dagAssetErr := sh.Dag().Get(context.Background(), assetCid)
				if dagAssetErr != nil {
					message := fmt.Sprintf("Error occured whilst reading asset DAG. (%s)", dagAssetErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagAssetSize, dagAssetSizeErr := dagAsset.Size()
				if dagAssetSizeErr != nil {
					helpers.WriteLog("error", dagAssetSizeErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagAssetSize), "pinning")

				size += dagAssetSize

				assetData, _, assetDataErr := dagAsset.Resolve([]string{"data"})
				if assetDataErr != nil {
					helpers.WriteLog("error", assetDataErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				cids := _deepParse(sh, assetData)
				invalid := false

				for _, cid := range cids {
					dagCid, dagCidErr := sh.Dag().Get(context.Background(), cid)
					if dagCidErr != nil {
						message := fmt.Sprintf("Error occured whilst reading asset CID DAG. (%s)", dagCidErr.Error())
						helpers.WriteLog("error", message, "pinning")

						updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
						_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

						if updateStatementErr != nil {
							helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
						}

						invalid = true
						break
					}

					dagCidSize, dagCidSizeErr := dagCid.Size()
					if dagCidSizeErr != nil {
						helpers.WriteLog("error", dagCidSizeErr.Error(), "pinning")

						updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
						_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

						if updateStatementErr != nil {
							helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
						}

						continue
					}
					helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagCidSize), "pinning")

					size += dagCidSize
				}

				if invalid {
					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}
					continue
				} else {
					updateStatement := "update co2_storage_scraper.contents set \"size\" = $1 where \"cid\" = $2;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, size, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}
				}
			case "1.0.1":
				assetCidStr, _, assetCidStrErr := dagBlock.Resolve([]string{"cid"})
				if assetCidStrErr != nil {
					helpers.WriteLog("error", assetCidStrErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				if _, ok := assetCidStr.(string); !ok {
					helpers.WriteLog("error", fmt.Sprintf("Asset %s CID field type: %v", content.Cid, assetCidStr), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				assetCid, assetCidErr := CID.Parse(assetCidStr)
				if assetCidErr != nil {
					message := fmt.Sprintf("%s is not valid CID. (%s)", assetCidStr, assetCidErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagAsset, dagAssetErr := sh.Dag().Get(context.Background(), assetCid)
				if dagAssetErr != nil {
					message := fmt.Sprintf("Error occured whilst reading asset DAG. (%s)", dagAssetErr.Error())
					helpers.WriteLog("error", message, "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				dagAssetSize, dagAssetSizeErr := dagAsset.Size()
				if dagAssetSizeErr != nil {
					helpers.WriteLog("error", dagAssetSizeErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}
				helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagAssetSize), "pinning")

				size += dagAssetSize

				dagAssetStr, _, dagAssetStrErr := dagAsset.Resolve([]string{})
				if dagAssetStrErr != nil {
					helpers.WriteLog("error", dagAssetStrErr.Error(), "pinning")

					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}

					continue
				}

				cids := _deepParse(sh, dagAssetStr)
				invalid := false

				for _, cid := range cids {
					dagCid, dagCidErr := sh.Dag().Get(context.Background(), cid)
					if dagCidErr != nil {
						message := fmt.Sprintf("Error occured whilst reading asset CID DAG. (%s)", dagCidErr.Error())
						helpers.WriteLog("error", message, "pinning")

						updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
						_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

						if updateStatementErr != nil {
							helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
						}

						invalid = true
						break
					}

					dagCidSize, dagCidSizeErr := dagCid.Size()
					if dagCidSizeErr != nil {
						helpers.WriteLog("error", dagCidSizeErr.Error(), "pinning")

						updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
						_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

						if updateStatementErr != nil {
							helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
						}

						continue
					}
					helpers.WriteLog("info", fmt.Sprintf("%s: %d", cid.String(), dagCidSize), "pinning")

					size += dagCidSize
				}

				if invalid {
					updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}
					continue
				} else {
					updateStatement := "update co2_storage_scraper.contents set \"size\" = $1 where \"cid\" = $2;"
					_, updateStatementErr := db.Exec(context.Background(), updateStatement, size, content.Cid)

					if updateStatementErr != nil {
						helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
					}
				}
			default:
				message := fmt.Sprintf("%s is not valid asset version.", version)
				helpers.WriteLog("error", message, "pinning")

				updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				continue
			}
		case "pipeline":
			switch version {
			case "1.0.0", "1.0.1":
				fmt.Printf("dagBlock: %v\n", dagBlock)
			default:
				message := fmt.Sprintf("%s is not valid pipeline version.", version)
				helpers.WriteLog("error", message, "pinning")

				updateStatement := "update co2_storage_scraper.contents set \"size\" = null where \"cid\" = $1;"
				_, updateStatementErr := db.Exec(context.Background(), updateStatement, content.Cid)

				if updateStatementErr != nil {
					helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
				}
				continue
			}
		default:
			message := fmt.Sprintf("%s is either invalid data structure or we don't calculate its size due to mutable nature of the structure (e.g. accounts).", content.DataStructure)
			helpers.WriteLog("error", message, "pinning")
			continue
		}
	}
}

func _deepParse(sh *shell.HttpApi, m interface{}) []CID.Cid {
	var cidList []CID.Cid
	if _, ok := m.([]interface{}); ok {
		for _, contentObject := range m.([]interface{}) {
			if contentObject == nil {
				continue
			}
			if _, ok := contentObject.(string); ok {
				contentObjectCid, contentObjectCidErr := CID.Parse(contentObject.(string))
				if contentObjectCidErr == nil {
					cidList = append(cidList, contentObjectCid)
				}
			} else {
				cidList = append(cidList, _deepParse(sh, contentObject)...)
			}
		}
	} else if _, ok := m.(map[string]interface{}); ok {
		for key, val := range m.(map[string]interface{}) {
			helpers.WriteLog("info", fmt.Sprintf("%v (%T): %v (%T)", key, key, val, val), "pinning")
			if val == nil {
				continue
			}
			if _, ok := val.(string); ok {
				valCid, valCidErr := CID.Parse(val.(string))
				if valCidErr == nil {
					cidList = append(cidList, valCid)
				}
			}
			if _, ok := val.([]interface{}); ok {
				cidList = append(cidList, _deepParse(sh, val)...)
			}
			if _, ok := val.(map[string]interface{}); ok {
				cidList = append(cidList, _deepParse(sh, val)...)
			}
		}
	}
	return cidList
}
