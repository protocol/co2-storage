import { FGStorage } from '@co2-storage/js-api'
import fs from 'fs'
import path from 'path'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const docPath1 = './assets/test image.jpg'
const docPath2 = './assets/test document.pdf'
const docPath3 = './assets/Virtuzone___UAE_Corporate_Tax_Guide_2023.pdf'
const docPath4 = './assets/test.zip'
//const docPath5 = './assets/5GB.bin'
//const docPath6 = './assets/100MB.bin'
//const docPath7 = './assets/10GB.bin'

// Create read stream
let readStream1 = fs.createReadStream(docPath1)
// Doc name
const docName1 = path.basename(docPath1)

// Create read stream
let readStream2 = fs.createReadStream(docPath2)
// Doc name
const docName2 = path.basename(docPath2)

// Create read stream
let readStream3 = fs.createReadStream(docPath3)
// Doc name
const docName3 = path.basename(docPath3)

// Create read stream
let readStream4 = fs.createReadStream(docPath4)
// Doc name
const docName4 = path.basename(docPath4)

const assetElements = [
    {
        "name": "big files",
        "value": [
            {
                "path": `/${docName2}`,
                "content": readStream2
            },
            {
                "path": `/${docName3}`,
                "content": readStream3
            },
            {
                "path": `/${docName4}`,
                "content": readStream4
            }
        ]
    },
    {
        "name": "big images",
        "value": [
            {
                "path": `/${docName1}`,
                "content": readStream1
            }
        ]
    }
]

let addAssetResponse = await fgStorage.addAsset(
    assetElements,
    {
        parent: null,
        name: "Test sliced file adding (07)",
        description: "Test sliced file adding (07)",
        template: "bafyreierpnk552e7k5sr2vwd7wt5oexxbgxq7q264iuo7v2tift3anexei",
        filesUploadStart: () => {
            console.log("Upload started")
        },
        filesUploadEnd: () => {
            console.log("Upload finished")
        },
        createAssetStart: () => {
            console.log("Creating asset")
        },
        createAssetEnd: () => {
            console.log("Asset created")
        }
    },
    'big.file.test.1',
    (status) => {
        console.dir(status, { depth: null })
    }
)

if(addAssetResponse.error != null) {
    console.error(addAssetResponse.error)
    await new Promise(reject => setTimeout(reject, 300));
    process.exit()
}

console.dir(addAssetResponse.result, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000))
process.exit()