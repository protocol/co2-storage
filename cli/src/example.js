import fs from 'fs'
import { Auth, EstuaryStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
const ipfsNodeAddr = "/dns4/sandbox.co2.storage/tcp/5002/https"

const auth = new Auth(authType)
const estuaryStorage = new EstuaryStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr})

/**
 * Authenticate with private key
 */

let authResponse = await auth.authenticate()
console.dir(authResponse, {depth: null})

if(authResponse.error != null) {
    console.error(authResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

/**
 * Get account data
 */

 let accountResponse = await estuaryStorage.getAccount()
if(accountResponse.error != null) {
    console.error(accountResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(accountResponse, {depth: null})

/**
 * Get your templates and assets
 */

let accountTemplatesAndAssetsResponse = await estuaryStorage.getAccountTemplatesAndAssets()
if(accountTemplatesAndAssetsResponse.error != null) {
    console.error(accountTemplatesAndAssetsResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(accountTemplatesAndAssetsResponse, {depth: null})

/**
 * List all existing templates
 * parameters: (offset, limit)  // default offset: 0, limit: 10 (limit <= 10)
 */

let getTemplatesResponse = await estuaryStorage.getTemplates()
if(getTemplatesResponse.error != null) {
    console.error(getTemplatesResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(getTemplatesResponse, {depth: null})

/**
 * Add a template
 * parameters: (template:json, template name:string, template base:string, template parent:string(CID))
 */

/*
let addTemplateResponse = await estuaryStorage.addTemplate({
    Country: { type: 'string', mandatory: true },
    Retired: { type: 'boolean' },
    Vintage: { type: 'date', mandatory: true }
}, 'Simplified test template', 'VCS', 'bafyreigijwcxu4nda2nol5x3cepjhel6mlvgyiizvivki3dpg3ttegdl2y')
if(addTemplateResponse.error != null) {
    console.error(addTemplateResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(addTemplateResponse, {depth: null})
*/

/**
 * Get template
 * parameters: template block CID
 */

const lastListedTemplate = getTemplatesResponse.result.list[getTemplatesResponse.result.list.length-1]
if(lastListedTemplate) {
    let getTemplateResponse = await estuaryStorage.getTemplate(lastListedTemplate.block)
    if(getTemplateResponse.error != null) {
        console.error(getTemplateResponse.error)
        await new Promise(resolve => setTimeout(resolve, 300));
        process.exit()
    }
    
    console.dir(getTemplateResponse, {depth: null})
}

/**
 * Add asset
 * parameters: { options } -> (assetElements:json, asset parent:string(CID), asset name:string, asset template:string(CID),
 *  upload start event callback, upload progress callback(bytes uploaded), upload end event callback,
 *  asset creation start event callback, asset creation end event callback)
 */

/*
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
        "value": null
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "QuantityIssued",
        "value": 0
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
        "value": 0
    },
    {
        "type": "InputText",
        "name": "CertificationBody",
        "value": ""
    },
    {
        "type": "InputText",
        "name": "SerialNumberBlockEnd",
        "value": ""
    },
    {
        "type": "InputNumber",
        "min": 0,
        "name": "TotalVintageQuantity",
        "value": 0
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

let addAssetResponse = await estuaryStorage.addAsset(assetElements,
    {
        parent: null,
        name: "Test asset (CLI)",
        template: "bafyreiht5ycyvl2x3p6jik3keahk25spw3c45dynhtwuvetjr66qwnj7ui",
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
    }
)
if(addAssetResponse.error != null) {
    console.error(addAssetResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(addAssetResponse, {depth: null})
*/

/**
 * Get asset
 * parameters: asset block CID
 */

const myLastAddedAsset = accountTemplatesAndAssetsResponse.result.assets[accountTemplatesAndAssetsResponse.result.assets.length-1]
if(myLastAddedAsset) {
    let getAssetResponse = await estuaryStorage.getAsset(myLastAddedAsset.block)
    if(getAssetResponse.error != null) {
        console.error(getAssetResponse.error)
        await new Promise(resolve => setTimeout(resolve, 300));
        process.exit()
    }

    console.dir(getAssetResponse, {depth: null})
}
 
await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()