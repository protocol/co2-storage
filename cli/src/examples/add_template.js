import { FGStorage } from '@co2-storage/js-api'

const authType = "pk"
const ipfsNodeType = "client"
//const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
//const fgApiUrl = "http://localhost:3020"
const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})

/**
 * Add a template
 * parameters: (template:json, template name:string, template base:string, template description:string, template parent:string(CID), chain_name: string)
 */

const template = {
    Country: { type: 'string', mandatory: true },
    Retired: { type: 'boolean' },
    Vintage: { type: 'date', mandatory: true }
}
const templateName = 'CLI example test template (7)'
const templateBase = {title: 'VCS', reference: 'bafyreigenzubua7r7rlxomgpyy2o4q46u6anvw3qvbxmlxhifkbrdbhcwm'}
const templateDescription = 'Test template (7)'
const templateParent = 'bafyreigijwcxu4nda2nol5x3cepjhel6mlvgyiizvivki3dpg3ttegdl2y'
const chainName = 'sandbox'
let addTemplateResponse = await fgStorage.addTemplate(template, templateName, templateBase, templateDescription, templateParent, chainName)
if(addTemplateResponse.error != null) {
    console.error(addTemplateResponse.error)
    await new Promise(reject => setTimeout(reject, 300));
    process.exit()
}

console.dir(addTemplateResponse.result, {depth: null})

await new Promise(resolve => setTimeout(resolve, 1000));

// Exit program
process.exit()
