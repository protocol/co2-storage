import { create } from 'ipfs-http-client'

// create / attach to node 
const ipfs = await create('/ip4/127.0.0.1/tcp/5001')

// Check pubsub subscriptions
const currentSubs = await ipfs.name.pubsub.subs()
for(const sub of currentSubs)
{
    const result = await ipfs.name.pubsub.cancel(sub.replace('/ipns/', ''))
    console.log(result.canceled)
}
console.log(await ipfs.name.pubsub.subs())

const nodeKeys = await ipfs.key.list()
for(const key of nodeKeys)
{
    if(key.name == 'self')
        continue
    await ipfs.key.rm(key.name)
}
console.log(await ipfs.key.list())

// exit program
process.exit()