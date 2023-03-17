import { FGStorage } from '@co2-storage/js-api'
import fs from 'fs'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
const fgApiUrl = "https://co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Add asset
 * parameters: { options } -> (assetElements:json, asset parent:string(CID), asset name:string, asset template:string(CID),
 *  upload start event callback, upload progress callback(bytes uploaded), upload end event callback,
 *  asset creation start event callback, asset creation end event callback)
 * 
 * used template structure
 * {
  "Photos": {
    "type": "images"
  },
  "Country": {
    "type": "text"
  },
  "Retired": {
    "type": "bool"
  },
  "Vintage": {
    "type": "datetime"
  },
  "Documents": {
    "type": "documents"
  },
  "ProjectID": {
    "min": 0,
    "type": "int"
  },
  "ProjectName": {
    "type": "text"
  },
  "ProjectType": {
    "type": "text"
  },
  "IssuanceDate": {
    "type": "date"
  },
  "SerialNumber": {
    "type": "int"
  },
  "IssuanceStatus": {
    "type": "list",
    "options": [
      "Active",
      "Retired",
      "Canceled"
    ]
  },
  "QuantityIssued": {
    "min": 0,
    "type": "float"
  },
  "RetirmentReason": {
    "type": "text"
  },
  "RetirementDetail": {
    "min": 0,
    "type": "float"
  },
  "CertificationBody": {
    "type": "text"
  },
  "SerialNumberBlockEnd": {
    "type": "text"
  },
  "TotalVintageQuantity": {
    "min": 0,
    "type": "float"
  },
  "SerialNumberBlockStart": {
    "type": "text"
  },
  "CorrespondingAdjustment": {
    "type": "text"
  },
  "Retirement/CancellationDate": {
    "type": "datetime"
  }
}
 */

const docPath = './assets/test document.pdf'
const imgPath = './assets/test image.jpg'
const doc = fs.readFileSync(docPath)
const img = fs.readFileSync(imgPath)

const assetElements = [
    {
        "name": "Photos",
        "value": [
            {
                "path": "/test image.jpg",
                "content": img
            }
        ]
    },
    {
        "name": "Country",
        "value": "SRB"
    },
    {
        "name": "Retired",
        "value": true
    },
    {
        "name": "Vintage",
        "value": null
    },
    {
        "name": "Documents",
        "value": [
            {
                "path": "/test document.pdf",
                "content": doc
            }
        ]
    },
    {
        "name": "ProjectID",
        "value": 3
    },
    {
        "name": "ProjectName",
        "value": "asdasda 1"
    },
    {
        "name": "ProjectType",
        "value": "asdasdas"
    },
    {
        "name": "IssuanceDate",
        "value": null
    },
    {
        "name": "SerialNumber",
        "value": 1
    },
    {
        "name": "IssuanceStatus",
        "value": "Canceled"
    },
    {
        "name": "QuantityIssued",
        "value": 10
    },
    {
        "name": "RetirmentReason",
        "value": ""
    },
    {
        "name": "RetirementDetail",
        "value": 20
    },
    {
        "name": "CertificationBody",
        "value": "sdf df sd"
    },
    {
        "name": "SerialNumberBlockEnd",
        "value": "23432423"
    },
    {
        "name": "TotalVintageQuantity",
        "value": 2340
    },
    {
        "name": "SerialNumberBlockStart",
        "value": ""
    },
    {
        "name": "CorrespondingAdjustment",
        "value": ""
    },
    {
        "name": "Retirement/CancellationDate",
        "value": null
    }
]

let addAssetResponse = await fgStorage.addAsset(
    assetElements,
    {
        parent: null,
        name: "Test asset added from CLI app (1)",
        description: "Test asset description (added from CLI app) (1)",
        template: "bafyreihh2sh3y6ny2w74g3kuwvv5k46ih4ebe3ga2jew65cnvsq2yifsye",    // CID of above template
        filesUploadStart: () => {
            console.log("Upload started")
        },
        filesUpload: async (bytes, path) => {
            console.log(`${bytes} uploaded`)
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
    'sandbox'
)
if(addAssetResponse.error != null) {
    console.error(addAssetResponse.error)
    await new Promise(reject => setTimeout(reject, 300));
    process.exit()
}

console.dir(addAssetResponse.result, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()
