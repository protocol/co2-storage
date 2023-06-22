import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import multihash from 'multihashes'

const methods = {
	cidObjToStr(cidObj){
		const bytes = Uint8Array.from(Object.values(cidObj.hash))
		const encoded = multihash.encode(bytes, 'sha2-256')
		encoded.bytes = bytes
		const cid = CID.createV1(cidObj.code, encoded)
		return cid.toString(base32)
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
