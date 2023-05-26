import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const typeCid = "bafyreiaw66zcnfrf6atbslmgcsk6bty4fxfleil4l4dpxvc55c52vwvc7i"

const assetElements = [
    {
        "name": "id",
        "value": "1d5ddf26-c282-492a-96c6-f900e66db308"
    },
    {
        "name": "name",
        "value": "name-dolores-occaecati-aspernatur"
    },
    {
        "name": "domain",
        "value": "insignificant-rose.name"
    },
    {
        "name": "address",
        "value": [
            {
                "name": "id",
                "value": "97b5acf2-137c-461a-a0f7-e5c64b434005"
            },
            {
                "name": "zip",
                "value": "gj88330-2749"
            },
            {
                "name": "city",
                "value": "Amaracester"
            },
            {
                "name": "state",
                "value": "Illinois"
            },
            {
                "name": "address",
                "value": "501 Leuschke Alley"
            },
            {
                "name": "country",
                "value": "Latvia"
            }
        ]
    },
    {
        "name": "projectId",
        "value": "764729"
    },
    {
        "name": "description",
        "value": "Atque repellat pariatur reprehenderit quas veniam sed fugit. Velit maiores voluptatum minima. Suscipit perspiciatis nihil fugit voluptatum cupiditate aspernatur sed. Tempora incidunt perspiciatis odit reiciendis. Quam consequatur sint quod fuga magni aliquid doloremque officia voluptatibus."
    },
    {
        "name": "projectInfo",
        "value": [
            {
                "name": "id",
                "value": "4181dd51-5720-476f-a85f-ed5fde29752f"
            },
            {
                "name": "country",
                "value": "Spain"
            },
            {
                "name": "registryId",
                "value": "393585"
            },
            {
                "name": "firstYearIssuance",
                "value": "2022"
            }
        ]
    }
]

let addAssetResponse = await fgStorage.addAsset(
  assetElements,
    {
        parent: null,
        name: "Asset 100 CLI (rapaygo examples)",
        description: "Asset 100 CLI (rapaygo examples)",
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
        waitingBacalhauJobStart: () => {
            console.log("Waiting for Bacalhau job to start execution")
        },
        bacalhauJobStarted: () => {
            console.log("Bacalhau job started execution")
        },
        createAssetStart: () => {
            console.log("Creating asset")
        },
        createAssetEnd: () => {
            console.log("Asset created")
        },
        error: (err) => {
            console.log(err)
            return
        }
    },
    'rapaygo examples',
    (response) => {
        if(response.status == 'uploading') {
            that.loading = true
            console.log(`${response.filename}: ${response.progress.toFixed(2)}%`)
        }
        else {
            console.dir(response, {depth: null})
        }
    }
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
