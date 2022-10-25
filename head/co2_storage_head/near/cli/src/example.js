import * as nearAPI from "near-api-js"

const { keyStores, KeyPair } = nearAPI
const myKeyStore = new keyStores.InMemoryKeyStore()

// creates a public / private key pair using the provided private key
const keyPair = KeyPair.fromString(process.env.PRIVATE_KEY)
console.log(keyPair.getPublicKey().toString())

// adds the keyPair you created to keyStore
await myKeyStore.setKey("testnet", "momcilo.testnet", keyPair);

const { connect } = nearAPI

const connectionConfig = {
  networkId: "testnet",
  keyStore: myKeyStore,
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
}
const nearConnection = await connect(connectionConfig)
console.dir(nearConnection, {depth: null})

const account = await nearConnection.account("momcilo.testnet")
console.dir(account, {depth: null})

// gets account balance
const balance = await account.getAccountBalance()
console.dir(balance, {depth: null})

// gets account details in terms of authorized apps and transactions
const details = await account.getAccountDetails()
console.dir(details, {depth: null})

// gets the state of the account
const state = await account.state()
console.dir(state, {depth: null})

// returns all access keys associated with an account
const accessKeys = await account.getAccessKeys()
console.dir(accessKeys, {depth: null})

const { Contract } = nearAPI

const contract = new Contract(
  account,
  "dev-1666097495224-56555349794548",
  {
    viewMethods: ["get_head"],
    changeMethods: ["set_head"]
  }
)
console.dir(contract, {depth: null})

const getHeadResponse = await contract.get_head()
console.dir(getHeadResponse, {depth: null})

const setHeadResponse = await contract.set_head({
    head: "bafyreigepvsfq5zqentqd3xlozaaafztvuimul3vnrpybih6htrfryneoe"
})
console.dir(getHeadResponse, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()