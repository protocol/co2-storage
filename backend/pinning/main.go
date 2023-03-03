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
	"sync"

	"github.com/adgsm/co2-storage-pinning/helpers"
	CID "github.com/ipfs/go-cid"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
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
			pin(db, unpinned)
		}
	})

	crn.AddFunc(config["check_pinning_nodes"], func() {
		pinsWithoutNodes, err := checkPinsWithoutNodes(db)
		if err == nil {
			kdht, kdhtErr := initDht(config)
			if kdhtErr == nil {
				findProviders(db, kdht, pinsWithoutNodes)
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

func pin(db *pgxpool.Pool, unpinned []PinningList) {
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
	rows, rowsErr := db.Query(context.Background(), "select \"cid\" from co2_storage_scraper.contents where archive is null and (array_length(ipfs_nodes, 1) = 0 or array_length(ipfs_nodes, 1) is null) and data_structure = 'asset' order by \"id\" asc;")

	if rowsErr != nil {
		fmt.Print(rowsErr.Error())
		message := "error occured whilst retrieving list of pinned CIDs without info about pinning nodes"
		helpers.WriteLog("error", message, "pinning")
		return nil, errors.New(message)
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

func initDht(config helpers.Config) (*dht.IpfsDHT, error) {
	ctx := context.Background()

	// create a new libp2p Host that listens on a random TCP port
	// we can specify port like /ip4/0.0.0.0/tcp/3326
	kdhtHost, kdhtHostErr := libp2p.New(libp2p.ListenAddrStrings("/ip4/0.0.0.0/tcp/0"))
	if kdhtHostErr != nil {
		return nil, kdhtHostErr
	}

	// view host details and addresses
	fmt.Printf("host ID %s\n", kdhtHost.ID().Pretty())
	fmt.Printf("following are the assigned addresses\n")
	for _, kdhtHostAddr := range kdhtHost.Addrs() {
		fmt.Printf("%s\n", kdhtHostAddr.String())
	}
	fmt.Printf("\n")

	bootstrapPeers := config["bootstrap_peers"]
	peers := strings.Split(bootstrapPeers, ",")
	discoveryPeers := []multiaddr.Multiaddr{}

	for _, peer := range peers {
		peer = strings.TrimSpace(peer)
		if peer == "" {
			continue
		}
		multiAddr, multiAddrErr := multiaddr.NewMultiaddr(peer)
		if multiAddrErr != nil {
			message := fmt.Sprintf("%s is not valid multiaddr.", peer)
			helpers.WriteLog("error", message, "pinning")
		}
		discoveryPeers = append(discoveryPeers, multiAddr)
		message := fmt.Sprintf("%s added to bootstrap.", multiAddr.String())
		helpers.WriteLog("info", message, "pinning")
	}

	kdht, dhtErr := _kDHT(ctx, kdhtHost, discoveryPeers)
	if dhtErr != nil {
		return nil, dhtErr
	}

	return kdht, nil
}

func findProviders(db *pgxpool.Pool, kdht *dht.IpfsDHT, cids []string) {
	for _, cid := range cids {
		// Find providers where this CID is pinned
		c, cerr := CID.Parse(cid)
		if cerr != nil {
			message := fmt.Sprintf("%s is not valid CID. (%s)", cid, cerr.Error())
			helpers.WriteLog("error", message, "pinning")
			continue
		}

		updateStatement := "update co2_storage_scraper.contents set \"archive\" = false where \"cid\" = $1;"
		_, updateStatementErr := db.Exec(context.Background(), updateStatement, cid)

		if updateStatementErr != nil {
			helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
		}
		helpers.WriteLog("info", fmt.Sprintf("Pinned CID %s marked \"in progress of obtaining pinning node ID\".", cid), "pinning")

		providers, providersError := kdht.FindProviders(context.Background(), c)
		if providersError != nil {
			message := fmt.Sprintf("Could not find providers for CID %s. (%s)", cid, providersError.Error())
			helpers.WriteLog("error", message, "pinning")

			updateStatement := "update co2_storage_scraper.contents set \"archive\" = null where \"cid\" = $1;"
			_, updateStatementErr := db.Exec(context.Background(), updateStatement, cid)

			if updateStatementErr != nil {
				helpers.WriteLog("error", updateStatementErr.Error(), "pinning")
			}
			helpers.WriteLog("info", fmt.Sprintf("Can not find providers for pinned CID %s.", cid), "pinning")
			return
		}

		if len(providers) > 0 {
			var providerList []string
			for _, provider := range providers {
				helpers.WriteLog("info", fmt.Sprintf("Provider %s added to list of providers for CID %s.", provider.ID.Pretty(), cid), "pinning")
				providerList = append(providerList, provider.ID.Pretty())
			}

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

func _kDHT(ctx context.Context, kdhtHost host.Host, bootstrapPeers []multiaddr.Multiaddr) (*dht.IpfsDHT, error) {
	var options []dht.Option

	// if no bootstrap peers give this peer act as a bootstraping node
	// other peers can use this peers ipfs address for peer discovery via dht
	if len(bootstrapPeers) == 0 {
		options = append(options, dht.Mode(dht.ModeServer))
	}

	kdht, err := dht.New(ctx, kdhtHost, options...)
	if err != nil {
		return nil, err
	}

	if err = kdht.Bootstrap(ctx); err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	for _, peerAddr := range bootstrapPeers {
		peerinfo, _ := peer.AddrInfoFromP2pAddr(peerAddr)

		wg.Add(1)
		go func() {
			defer wg.Done()
			if peerInfoErr := kdhtHost.Connect(ctx, *peerinfo); peerInfoErr != nil {
				message := fmt.Sprintf("error while connecting to node %q: %-v", peerinfo, peerInfoErr)
				helpers.WriteLog("error", message, "pinning")
			} else {
				message := fmt.Sprintf("connection established with bootstrap node: %q", *peerinfo)
				helpers.WriteLog("info", message, "pinning")
			}
		}()
	}
	wg.Wait()

	return kdht, nil
}
