import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import multihash from 'multihashes'

const methods = {
	cidObjToStr(cidObj){
		if(typeof cidObj == 'object' && !Array.isArray(cidObj) && Object.keys(cidObj).indexOf("/") > -1) {
			const val = cidObj["/"]
			if(typeof val == 'string') {
				return val
			}
			else {
				return cidObj.toString(base32)
			}
		}
		else if(typeof cidObj == 'object' && !Array.isArray(cidObj) && Object.keys(cidObj)["code"] > -1 && Object.keys(cidObj)["hash"] > -1) {
			const bytes = Uint8Array.from(Object.values(cidObj.hash))
			const encoded = multihash.encode(bytes, 'sha2-256')
			encoded.bytes = bytes
			
			return (CID.createV1(cidObj.code, encoded)).toString(base32)
		}
		else if(typeof cidObj == 'string') {
			return cidObj
		}
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
