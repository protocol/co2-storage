import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Sign CID
 * parameters: blockCid: string, callback: function(response)
 */

const cid = 'bafyreicakk2qxdwlx52l547jj3goez5horyslk6jprofr3k3dgwvnurwzm'
const contributorName = 'Moca'
const contributionLicense = 'CC0 (No Rights Reserved, Public Domain)'
const contributionNote = 'Test note'
const indexingDataChain = 'test'

const response = await fgStorage.addProvenanceMessage(cid, contributorName, contributionLicense, contributionNote, indexingDataChain)

console.dir(response, { depth: null })

await new Promise(resolve => setTimeout(resolve, 1000))

// Exit program
process.exit()
