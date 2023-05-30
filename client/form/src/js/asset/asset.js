import ensureIpfsIsRunning from '@/src/mixins/ipfs/ensure-ipfs-is-running.js'
import { authentication } from '@/src/mixins/authentication/authentication.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'
import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'
import determineTemplateTypeAndKeys from '@/src/mixins/ipfs/determine-template-type-and-keys.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'

import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'

import VueJsonPretty from 'vue-json-pretty'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	await this.initFgStorage()

	// Ensure IPFS is running
	await this.ensureIpfsIsRunning(this.fgStorage)
}

const computed = {
	templatesClass() {
		return this.theme + '-templates-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	},
	ipfs() {
		return this.$store.getters['main/getIpfs']
	},
	selectedAddress() {
		return this.$store.getters['main/getSelectedAddress']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	fgApiToken() {
		return this.$store.getters['main/getFgApiToken']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	},
	fgApiProfileDefaultDataLicense() {
		return this.$store.getters['main/getFgApiProfileDefaultDataLicense']
	},
	fgApiProfileName() {
		return this.$store.getters['main/getFgApiProfileName']
	}
}

const watch = {
	json: {
		handler(state, before) {
			if(state)
				this.formElements = this.updateForm(this.json)
			
			// If schema content is deleted reset schema
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.template = null
		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
	// init
	await this.init()
}

const methods = {
	async init() {
		const that = this

		this.hasMySignature = {}

		const routeParams = this.$route.params
		const queryParams = this.$route.query

		if(queryParams['provenance'] != undefined && queryParams['provenance'].toLowerCase() == 'false')
			this.requireProvenance = false

		if(queryParams['metadata'] != undefined && queryParams['metadata'].toLowerCase() == 'false')
			this.requireMetadata = false

		if(queryParams['thank-you'] != undefined && queryParams['thank-you'].toLowerCase() == 'true')
			this.requireThankYou = true

		if(queryParams['read-only'] != undefined && queryParams['read-only'].toLowerCase() == 'false')
			this.readOnly = false

		if(routeParams['cid']) {
			this.asset = routeParams['cid']
			this.getAsset(this.asset)
		}
		else {
			this.validatedTemplate = true
			this.template = null
		}
	},
	async getAsset(cid) {
		const that = this
		try {
			const getAssetResponse = (await this.fgStorage.getAsset(cid)).result

			let asset = getAssetResponse.asset
			const assetBlock = getAssetResponse.assetBlock
			const templateBlockCid = getAssetResponse.assetBlock.template.toString()

			const assetBlockVersion = assetBlock.version
			switch (assetBlockVersion) {
				case "1.0.0":
					asset = asset.data
					break
				case "1.0.1":
					// do nothing (it is raw asset already)
					break
				default:
					// consider it being version 1.0.0
					asset = asset.data
					break
			}

			this.assetName = assetBlock.name
			this.assetDescription = assetBlock.description
	
			this.template = templateBlockCid
			this.setTemplate(this.template)

			while(!this.formElements.length) {
				await this.delay(100)
			}
			await this._assignFormElementsValues(asset, this.formElements)

			if(this.requireProvenance)
				await this.loadSignatures(cid)
		} catch (error) {
			this.validatedTemplate = true
			this.template = null
			return
		}
	},
	async _assignFormElementsValues(asset, formElements) {
		const that = this
		for await (let element of formElements) {
			const key = element.name
			const assetKeys = asset.map((a) => {return Object.keys(a)[0]})
			const assetValIndex = assetKeys.indexOf(key)
			const formElementsKeys = formElements.map((fe) => {return fe.name})
			const formElementsValIndex = formElementsKeys.indexOf(key)
			if(assetValIndex == -1 || formElementsValIndex == -1)
				continue
			
			if(element.type == 'Images' || element.type == 'Documents') {
				element.value = []
				const dfiles = asset[assetValIndex][key]
				if(dfiles != null)
					for await (const dfile of dfiles) {
						this.loadingMessage = this.$t('message.shared.loading-something', {something: dfile.path})

						const buffer = await this.fgStorage.getRawData(dfile.cid)

						element.value.push({
							path: dfile.path,
							content: buffer,
							existing: true,
							cid: dfile.cid
						})
					}
			}
			else if(element.type == 'BacalhauUrlDataset' || element.type == 'BacalhauCustomDockerJobWithUrlInputs'
				|| element.type == 'BacalhauCustomDockerJobWithCidInputs' || element.type == 'BacalhauCustomDockerJobWithoutInputs') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				for (const k in asset[assetValIndex][key]) {
					if (asset[assetValIndex][key].hasOwnProperty(k)) {
						element.value[k] = asset[assetValIndex][key][k]
					}
				}

				if(element.value.job_uuid && (!element.value.job_cid || (element.value.job_cid && element.value.job_cid.toLowerCase() == 'error'))) {
					this.bacalhauJobStatus(element.value.job_uuid, `${key}-${assetValIndex}`, element)
					this.intervalId[`${key}-${assetValIndex}`] = setInterval(this.bacalhauJobStatus, 5000, element.value.job_uuid, `${key}-${assetValIndex}`, element)
				}
			}
			else if(element.type == 'JSON') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[assetValIndex][key]

				if(!this.readOnly) {
					if(this.$refs.formElements.formElementsJsonEditorMode[element.name] == undefined)
						this.$refs.formElements.formElementsJsonEditorMode[element.name] = 'code'
				
					switch (this.$refs.formElements.formElementsJsonEditorMode[element.name]) {
						case 'code':
							this.$refs.formElements.formElementsJsonEditorContent[element.name] = {
								text: JSON.stringify(element.value),
								json: undefined
							}
							this.$refs.formElements.$refs[`jsonEditor-${element.name}`][0].setContent({"text": this.$refs.formElements.formElementsJsonEditorContent[element.name].text})
							break
						case 'tree':
							this.$refs.formElements.formElementsJsonEditorContent[element.name] = {
								json: JSON.parse(JSON.stringify(element.value)),
								text: undefined
							}
							this.$refs.formElements.$refs[`jsonEditor-${element.name}`][0].setContent({"json": this.$refs.formElements.formElementsJsonEditorContent[element.name].json})
							break
						default:
							console.log(`Unknown JSON editor mode '${this.$refs.formElements.formElementsJsonEditorMode[element.name]}'`)
							break
					}
				}
			}
			else if(element.type == 'Template' || element.type == 'TemplateList') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				while(typeof formElements[formElementsValIndex].value != 'object') {
					await this.delay(100)
				}
				await this._assignFormElementsValues(asset[assetValIndex][key], formElements[formElementsValIndex].value)
			}
			else {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[assetValIndex][key]
			}
		}
	},
	async setTemplate(cid) {
		const that = this

		this.formElementsWithSubformElements.length = 0
		let templateResponse
		try {
			templateResponse = (await this.fgStorage.getTemplate(cid)).result
		} catch (error) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		let template = templateResponse.template
		const templateTypeAndKeys = this.determineTemplateTypeAndKeys(template)
		const templateType = templateTypeAndKeys.templateType
		const templateKeys = templateTypeAndKeys.templateKeys
		const key = templateKeys[0]
		const index = 0

		if(key == undefined) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		switch (templateType) {
			case 'list_of_lists':
			case 'list_of_objects':
				if(templateType == 'list_of_lists') {
					if(template[index][1].type == undefined) {
						this.validatedTemplate = true
						this.template = null
						return
					}
				}
				else if(templateType == 'list_of_objects') {
					if(template[index][key].type == undefined) {
						this.validatedTemplate = true
						this.template = null
						return
					}
				}
				break
			default:
				if(template[key].type == undefined) {
					this.validatedTemplate = true
					this.template = null
					return
				}
		}

		try {
			const results = (await this.fgStorage.search(null, null, 'template', cid)).result
			if(!results.length || results[0].chain_name == undefined) {
				this.validatedTemplate = true
				this.template = null
				return
			}
			this.$store.dispatch('main/setIpfsChainName', results[0].chain_name)
		} catch (error) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		this.validatedTemplate = true

		template = this.normalizeSchemaFields(template)
		this.json = JSON.parse(JSON.stringify(template))

		const templateBlock = templateResponse.templateBlock
		this.templateName = templateBlock.name
		this.templateDescription = templateBlock.description
		this.assetName = this.$t('message.assets.generic-asset-name', {template: this.templateName, wallet: this.selectedAddress})
		this.template = cid

		this.$nextTick(() => {
			try {
				that.$refs.formElements.formElementsOccurrences = {}
				that.$refs.formElements.subformElements = {}
			} catch (error) {
				
			}
		})
	},
	async loadSignatures(cid, maxAttempts, attempt) {
		let entities = await this.provenanceMessages(cid)
		if(entities.error)
			return

		if(attempt == undefined)
			attempt = 0
		if(maxAttempts == undefined)
			maxAttempts = 5
		
		if(attempt >= maxAttempts-1)
			return

		this.signedDialogs.length = 0

		if(entities.result.length == 0) {
			const record = await this.fgStorage.search(this.ipfsChainName, null, null, cid)
			if(record.error) {
				this.printError(record.error, 3000)
				return
			}
			let entity = record.result[0]
			if(entity && entity.signature && entity.signature.length) {
				entity.reference = entity.cid
				await this.printSignature(entity)
				return
			}
			else {
				await this.delay(1000)
				await this.loadSignatures(cid, maxAttempts, ++attempt)
			}
		}

		for await(let entity of entities.result) {
			entity.signed = entity.signature && entity.signature.length
			const provenanceMessageSignature = await this.fgStorage.getDag(entity.cid)
			entity.provenanceMessageSignature = provenanceMessageSignature
			const provenanceMessage = await this.fgStorage.getDag(entity.provenanceMessageSignature.provenance_message)
			entity.provenanceMessage = provenanceMessage
			await this.printSignature(entity)
		}
	},
	async printSignature(entity) {
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		let verifyCidSignatureResponse
		try {
			verifyCidSignatureResponse = await this.fgStorage.verifyCidSignature(entity.signature_account,
				entity.signature_cid, entity.signature_v, entity.signature_r, entity.signature_s)
		} catch (error) {
			entity.verified = false
			this.walletNeeded = true
			this.signedDialogs.push(entity)
			this.loading = false
			return
		}
		entity.verified = verifyCidSignatureResponse.result
		this.signedDialogs.push(entity)
		this.loading = false
	},
	async provenanceMessages(cid) {
		const provenance = await this.fgStorage.search(this.ipfsChainName, null, 'provenance', null, null, null, null, null, cid)
		if(provenance.error) {
			this.printError(provenance.error, 3000)
			return {
				result: null,
				error: provenance.error
			}
		}
		return {
			result: provenance.result,
			error: null
		}
	},
	async connectWallet() {
		const wallet = await this.fgStorage.authenticate()
		if(wallet.error) {
			this.printError(wallet.error, 3000)
			return
		}
		await this.init()
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		ensureIpfsIsRunning,
		authentication,
		fgStorage,
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		humanReadableFileSize,
		navigate,
		cookie,
		normalizeSchemaFields,
		determineTemplateTypeAndKeys,
		delay,
		printError
	],
	components: {
		FormElements,
		LoadingBlocker,
		InputText,
		InputSwitch,
		Textarea,
		Dropdown,
		Button,
		Toast,
		Dialog,
		VueJsonPretty
	},
	directives: {
		Tooltip
	},
	name: 'Assets',
	data () {
		return {
			json: null,
			formElements: [],
			formElementsWithSubformElements: [],
			template: null,
			validatedTemplate: false,
			assetName: '',
			assetDescription: '',
			loading: false,
			loadingMessage: '',
			intervalId: {},
			templateName: null,
			templateDescription: null,
			licenseOptions: [
				"CC0 (No Rights Reserved, Public Domain)",
				"CC-BY (Attribution)",
				"CC BY-SA (Attribution-ShareAlike)",
				"CC BY-NC (Attribution-NonCommercial)",
				"Reserved"
			],
			cn: null,
			dl: null,
			notes: null,
			requireProvenance: true,
			requireMetadata: true,
			requireThankYou: false,
			asset: null,
			signedDialogs: [],
			indexingInterval: 5000,
			readOnly: true,
			walletNeeded: false
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
