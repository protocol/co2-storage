import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

//const dagCbors = ["bafyreih4pji37htdhepzltpq6fifgdkwgb2l7yflm4if3pbwqwz6vi6k3q"]
//const dagCbors = ["bafyreibxm2zsr66qotjh2vraapnukyrd4n6qvbwfxllwqpi7ssfzchgomu"]
const dagCbors = ["bafyreibdvfxofhmoclyan6dvqzvuuzz57ezfuspcd3q3dm5w6xd2vwsysm"]

try {
    const serialized = await fgStorage.serializeBacalhauJobInputs(dagCbors)
    console.log(serialized.result.toString())
//    console.dir(serialized, {depth: null})
} catch (error) {
    console.log(error)
}

process.exit()