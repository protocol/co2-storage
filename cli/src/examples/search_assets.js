import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web2.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Search assets
 * parameters: (chainName, phrases, cid, name, base, account, offset, limit, sortBy, sortDir)
 * // default data_chain: 'sandbox', phrases: null, cid: null, name: null, base: null, account: null, offset: 0, limit: 10
 */

let searchAssetsResponse = await fgStorage.searchAssets('sandbox')    // ('SP Audits', 'Water')
if(searchAssetsResponse.error != null) {
    console.error(searchAssetsResponse.error)
    await new Promise(reject => setTimeout(reject, 300));
    process.exit()
}

console.dir(searchAssetsResponse.result, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()
