
import { FGStorage } from '@co2-storage/js-api'

import determineTemplateTypeAndKeys from '@/src/mixins/ipfs/determine-template-type-and-keys.js'

const computed = {
	co2StorageAuthType() {
		return this.$store.getters['main/getCO2StorageAuthType']
	},
	co2StorageIpfsNodeType() {
		return this.$store.getters['main/getCO2StorageIpfsNodeType']
	},
	co2StorageIpfsNodeAddr() {
		return this.$store.getters['main/getCO2StorageIpfsNodeAddr']
	},
	fgApiUrl() {
		return this.$store.getters['main/getFgApiUrl']
	},
	mode() {
		return this.$store.getters['main/getMode']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	fgApiToken() {
		return this.$store.getters['main/getFgApiToken']
	}
}

const methods = {
	async initFgStorage() {
		if(this.mode == 'fg' && this.fgStorage == null)
			this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr, fgApiHost: this.fgApiUrl, fgApiToken: this.fgApiToken}))
	},
	async validateTemplate(cid) {
		let indexChain
		try {
			const results = (await this.fgStorage.search(null, null, 'template', cid)).result
			if(!results.length || results[0].chain_name == undefined)
				return {
					error: `Can not find template ${cid}`,
					result: null
				}
			indexChain = results[0].chain_name
		} catch (error) {
			return {
				error: error,
				result: null
			}
		}

		let templateResponse
		try {
			templateResponse = (await this.fgStorage.getTemplate(cid)).result
		} catch (error) {
			return {
				error: error,
				result: null
			}
		}

		let template = templateResponse.template
		const templateTypeAndKeys = this.determineTemplateTypeAndKeys(template)
		const templateType = templateTypeAndKeys.templateType
		const templateKeys = templateTypeAndKeys.templateKeys
		const key = templateKeys[0]
		const index = 0

		if(key == undefined)
			return {
				error: 'No keys found in template',
				result: null
			}

		switch (templateType) {
			case 'list_of_lists':
			case 'list_of_objects':
				if(templateType == 'list_of_lists') {
					if(template[index][1].type == undefined)
						return {
							error: 'No type property found in template',
							result: null
						}
				}
				else if(templateType == 'list_of_objects') {
					if(template[index][key].type == undefined)
						return {
							error: 'No type property found in template',
							result: null
						}
				}
				break
			default:
				if(template[key].type == undefined)
					return {
						error: 'No type property found in template',
						result: null
					}
		}

		return {
			result: {
				template: template,
				metadata: templateResponse.templateBlock,
				cid: templateResponse.block,
				type: templateType,
				keys: templateKeys,
				indexChain: indexChain
			},
			error: null
		}
	}
}

export const fgStorage = {
	computed: computed,
	mixins: [
		determineTemplateTypeAndKeys
	],
	data () {
		return {
		}
	},
	methods: methods
}
