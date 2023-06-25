import { FGStorage } from '@co2-storage/js-api'

const authType = "pk" // or "metamask"
const ipfsNodeType = "client"
const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web2.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const ipfs = await fgStorage.ensureIpfsIsRunning()

const cid = 'bafybeibks5ute3txdug5cy3dyyggogbp7cmav57rylgwllnl6lghsjyml4'
const buffer = await fgStorage.getRawData(cid)
// Get first 100 bytes only
//const buffer = await fgStorage.getRawData(cid, {offset: 0, length: 100})

console.log(buffer)

process.exit()
