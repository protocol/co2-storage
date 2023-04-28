import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const typeCid = "bafyreiejed4kjj7jhpb4rokbrzs4wa4g6q65rnffxcbgbpgfftbekeb7am"

const assetElements = [
  {
      "name": "id",
      "value": "uioiuoi"
  },
  {
      "name": "name",
      "value": "oiuoiuoi"
  },
  {
      "name": "domain",
      "value": "uio"
  },
  {
      "name": "address",
      "value": [
          {
              "name": "id",
              "value": "ioio"
          },
          {
              "name": "zip",
              "value": "iouioui"
          },
          {
              "name": "city",
              "value": "iouoii"
          },
          {
              "name": "state",
              "value": "ouiouio"
          },
          {
              "name": "address",
              "value": "iuiou"
          },
          {
              "name": "country",
              "value": "ouoioui"
          }
      ]
  },
  {
      "name": "projectId",
      "value": "uoioi"
  },
  {
      "name": "description",
      "value": "oiuoi"
  },
  {
      "name": "projectInfo",
      "value": [
          {
              "name": "id",
              "value": "uoi"
          },
          {
              "name": "country",
              "value": "uo"
          },
          {
              "name": "registryId",
              "value": "uoiuio"
          },
          {
              "name": "firstYearIssuance",
              "value": "oiuiou"
          }
      ]
  }
]

let addAssetResponse = await fgStorage.addAsset(
  assetElements,
    {
        parent: null,
        name: "Asset 2 CORRECTED Graphene IWA Template",
        description: "Asset 2 CORRECTED Graphene IWA Template",
        template: typeCid,    // CID of above defined type
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
    'rapaygo examples'
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
