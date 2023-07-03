import { FGStorage } from '@co2-storage/js-api'

import { CID } from 'multiformats/cid'

const authType = "pk" // or "metamask"
const ipfsNodeType = "client"
const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web2.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const ipfs = await fgStorage.ensureIpfsIsRunning()

//const cid = CID.parse('bafybeifcd5ysgcmgsn3l3nebo3wu7jsuf7xumnsfup55dk2ikis3ujsnue')
const cid = CID.parse('bafybeie54djvgdlisullgneqxicanwychoeihj23bftpus6rtazmcmc4ui')
let bufferBytes = 0

// Using ipfs.cat without offset and length parameters
for await (const buf of ipfs.cat(cid, {})) {
    bufferBytes += buf.byteLength
}
console.log(`Bytes received when using ipfs.cat WITHOUT offset and length parameters: ${bufferBytes}`)

// Using ipfs.cat with offset and length parameters
bufferBytes = 0
let offset = 0
const length = 1024*1024
let sliceBytes = 1
while(sliceBytes > 0) {
    sliceBytes = await readSlice(cid, offset, length)
    bufferBytes += sliceBytes
    offset = bufferBytes
}
console.log(`Bytes received when using ipfs.cat WITH offset and length parameters: ${bufferBytes}`)

async function readSlice(cid, offset, length) {
    let sliceLen = 0
    for await (const buf of ipfs.cat(cid, {offset: offset, length: length})) {
        const bufLen = buf.byteLength
        sliceLen += bufLen
    }
    console.log(`Offset: ${offset}, Slice: ${sliceLen}`)
    return sliceLen
}

//const stat = await ipfs.object.stat(cid)
//console.dir(stat, { depth: null })

process.exit()
