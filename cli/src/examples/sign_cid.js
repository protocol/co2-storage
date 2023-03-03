import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
const fgApiUrl = "http://localhost:3020"
// const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
// const fgApiUrl = "https://co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Sign CID
 * parameters: blockCid: string, callback: function(response)
 */

await fgStorage.signCid('bafyreicwpiopvmb43rv6pi2ohpvagrx4bc5it55xv7lraa23jwdd4vbrqy', (response) => {
    console.dir(response, {depth: null})
})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()