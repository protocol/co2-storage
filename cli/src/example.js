import { Auth, EstuaryStorage } from '@co2-storage/js-api'

const auth = new Auth("pk")
const estuaryStorage = new EstuaryStorage({authType: "pk", ipfsNodeType: "client", ipfsNodeAddr: "/ip4/127.0.0.1/tcp/5001"})

let authResponse = await auth.authenticate()
console.dir(authResponse, {depth: null})

if(authResponse.error != null) {
    console.error(authResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

let accountResponse = await estuaryStorage.getAccount()
if(accountResponse.error != null) {
    console.error(accountResponse.error)
    await new Promise(resolve => setTimeout(resolve, 300));
    process.exit()
}

console.dir(accountResponse, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()