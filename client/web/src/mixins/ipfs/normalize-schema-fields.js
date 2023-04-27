import cidObjToStr from '@/src/mixins/ipfs/cid-obj-to-str.js'

const methods = {
	normalizeSchemaFields(template){
		if(Array.isArray(template)) {
			for (const el of template) {
				if(Array.isArray(el)) {
					const val = el[1]
					if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template'
						|| val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value
							&& typeof val.value == 'object')
						val.value = this.cidObjToStr(val.value)
				}
				else {
					const key = Object.keys(el)[0]
					const val = el[key]
					if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template'
						|| val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value
							&& typeof val.value == 'object')
						val.value = this.cidObjToStr(val.value)
				}
			}
		}
		else {
			const keys = Object.keys(template)
			for (const key of keys) {
				const val = template[key]
				if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template'
					|| val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value
						&& typeof val.value == 'object')
					val.value = this.cidObjToStr(val.value)
			}
		}
		return template
	}
}

export default {
	data () {
		return {
		}
	},
	mixins: [
		cidObjToStr
	],
	methods: methods
}
