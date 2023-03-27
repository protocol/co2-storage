import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Search
 * parameters: (chainName, phrases, dataStructure, cid, parent, name, description, base, 
reference, contentCid, creator, createdFrom, createdTo, version, offset, limit, sortBy, sortDir)
 */

let searchResponse = await fgStorage.search(null, null, 'asset', null, null, null, null, null, 
'bafyreigcprw3dp3mrsv2xgysomratgv3oz4cpl3rsiij2hzucckyxfbpd4')
if(searchResponse.error != null) {
    console.error(searchResponse.error)
    await new Promise(reject => setTimeout(reject, 300));
    process.exit()
}

console.dir(searchResponse.result, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()
