import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const typeCid = "bafyreiasb427becqasv23i7vz2pedq33kyrdhbka5ysfuh6si3qlbheuim"

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

/*
const assetElements = [
    {
        "name": "id",
        "value":"81a512ce-e974-4de2-a351-b7a923e238e5"
    },
    {
        "name":"name",
        "value":"name-dolorum-dignissimos-architecto"
    },
    {
        "name": "domain",
        "value":"free-common.info"
    },
    {
        "name": "projectId",
        "value":"715727"
    },
    {
        "name": "description",
        "value":"Quam voluptatum fuga. Reiciendis molestias ab. Assumenda itaque ab. Repellat quasi tenetur numquam minima assumenda. Voluptatibus quisquam illum voluptatum expedita ad."
    },
    {
        "name": "address",
        "value":
        [
            {
                "name": "id",
                "value":"33ef349d-f86e-4dc7-92e7-94e84acacf23"
            },
            {
                "name": "address",
                "value":"0368 Vandervort Fords"
            },
            {
                "name": "city",
                "value":"North Lilianworth"
            },
            {
                "name": "state",
                "value":"South Dakota"
            },
            {
                "name":"zip",
                "value":"55168-5294"
            },
            {
                "name": "country",
                "value":"Tonga"
            }
        ]
    },
    {
        "name": "projectInfo",
        "value":
        [
            {
                "name": "id",
                "value":"0ccb68ee-4dc6-4645-94d0-9f7a1aa10de1"
            },
            {
                "name": "country",
                "value":"Colombia"
            },
            {
                "name":"firstYearIssuance",
                "value":2023
            },
            {
                "name":"registryId",
                "value":"149825"
            }
        ]
    }
]
*/
let addAssetResponse = await fgStorage.addAsset(
  assetElements,
    {
        parent: null,
        name: "Asset 4 CORRECTED Graphene IWA Template",
        description: "Asset 4 CORRECTED Graphene IWA Template",
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
