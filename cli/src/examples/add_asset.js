import { FGStorage } from '@co2-storage/js-api'
import fs from 'fs'

const authType = "pk"
const ipfsNodeType = "client"
const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
const fgApiUrl = "http://localhost:3020"
// const ipfsNodeAddr = "/dns4/web2.co2.storage/tcp/5002/https"
// const fgApiUrl = "https://co2.storage"

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
    "type": "InputNumber"
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
        "type": "Images",
        "name": "Photos",
        "value": [
            {
                "path": "/test image.jpg",
                "content": img
            }
        ]
    },
    {
        "type": "InputText",
        "name": "Country",
        "value": "SRB"
    },
    {
        "type": "InputSwitch",
        "name": "Retired",
        "value": false
    },
    {
        "type": "Date",
        "name": "Vintage",
        "value": null
    },
    {
        "type": "Documents",
        "name": "Documents",
        "value": [
            {
                "path": "/test document.pdf",
                "content": doc
            }
        ]
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "ProjectID",
        "value": 0
    },
    {
        "type": "InputText",
        "name": "ProjectName",
        "value": "asdasda"
    },
    {
        "type": "InputText",
        "name": "ProjectType",
        "value": "asdasdas"
    },
    {
        "type": "Date",
        "name": "IssuanceDate",
        "value": null
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "SerialNumber",
        "value": 1
    },
    {
        "type": "Dropdown",
        "name": "IssuanceStatus",
        "options": [
            "Active",
            "Retired",
            "Canceled"
        ],
        "value": "Retired"
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "QuantityIssued",
        "value": 10
    },
    {
        "type": "InputText",
        "name": "RetirmentReason",
        "value": ""
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "RetirementDetail",
        "value": 20
    },
    {
        "type": "InputText",
        "name": "CertificationBody",
        "value": "sdf df sd"
    },
    {
        "type": "InputText",
        "name": "SerialNumberBlockEnd",
        "value": "23432423"
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "TotalVintageQuantity",
        "value": 2340
    },
    {
        "type": "InputText",
        "name": "SerialNumberBlockStart",
        "value": ""
    },
    {
        "type": "InputText",
        "name": "CorrespondingAdjustment",
        "value": ""
    },
    {
        "type": "Date",
        "name": "Retirement/CancellationDate",
        "value": null
    }
]

let addAssetResponse = await fgStorage.addAsset(
    assetElements,
    {
        parent: null,
        name: "Test asset (CLI)",
        description: "Test asset description (CLI)",
        template: "bafyreidozcruvstesf7azvqjxgq4oxic2ig2uccjskxfency6be7whykhq",    // CID of above template
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