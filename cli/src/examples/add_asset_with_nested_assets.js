import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

const typeCid = "bafyreib4jvh4yjqltczdx3hhf277end2li42dr2l6mgmzxid2us2zwvavm"

const assetElements = [
    {
        "name": "Person",
        "value": "bafyreif5h32c3t7ovhtrazsxi3ya6wbr4gczbaaz6niehzz664b2as5nry"
    },
    {
        "name": "Address",
        "value": "bafyreidiib3f66jm5fjdfiigum3u7mm5smxsjyrhdnjfdvg4akx26x246i"
    }
]

let addAssetResponse = await fgStorage.addAsset(
  assetElements,
    {
        parent: null,
        name: "[TEST] Contact created with nested assets",
        description: "[TEST] Contact created with nested assets",
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
    'Nested types example',
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
