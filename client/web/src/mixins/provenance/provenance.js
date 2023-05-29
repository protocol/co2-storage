import printError from '@/src/mixins/error/print.js'

const methods = {
	sign(cid){
		this.contributionCid = cid
		this.displayContributorDialog = true
	},
	async signRequest(contribution) {
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		try {
			let response = await this.fgStorage.addProvenanceMessage(contribution.cid, contribution.contributorName,
				contribution.dataLicense, contribution.notes, this.ipfsChainName)
			await this.signResponse(response)
		} catch (error) {
			this.loading = false
			this.printError(error, 3000)
		}
	},
	async signResponse(response) {
		const that = this
		this.signDialog = response
		this.displaySignDialog = true
		setTimeout(async () => {
			try {
				that.templatesSearchOffset = 0
				await that.loadTemplates()
				that.assetsSearchOffset = 0
				await that.loadAssets()
			} catch (error) {
			}
		}, this.indexingInterval)
		this.loading = false
	},
	async loadSignatures(cid) {
		let entities = await this.provenanceMessages(cid)
		if(entities.error)
			return

		this.signedDialogs.length = 0

		if(entities.result.length == 0) {
			const record = await this.fgStorage.search(this.ipfsChainName, null, null, cid)
			if(record.error) {
				this.printError(record.error, 3000)
				return
			}
			if(record.result.length == 0) {
				this.printError(this.$t('message.shared.empty-recordset'), 3000)
				return
			}
			let entity = record.result[0]
			entity.reference = entity.cid
			await this.printSignature(entity)
			return
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
		const verifyCidSignatureResponse = await this.fgStorage.verifyCidSignature(entity.signature_account,
			entity.signature_cid, entity.signature_v, entity.signature_r, entity.signature_s)
		entity.verified = verifyCidSignatureResponse.result
		this.signedDialogs.push(entity)
		this.hasMySignature[entity.reference] = this.hasMySignature[entity.reference] || (entity.signature_account == this.selectedAddress)
		this.displaySignedDialog = true
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
	async hasProvenance(cid) {
		const provenance = await this.fgStorage.search(this.ipfsChainName, null, 'provenance', null, null, null, null, null, cid)
		this.provenanceExist[cid] = provenance.result && provenance.result.length > 0
		return provenance.result && provenance.result.length > 0
	}
}

export const provenance = {
	mixins: [
		printError
	],
	data () {
		return {
		}
	},
	methods: methods
}
