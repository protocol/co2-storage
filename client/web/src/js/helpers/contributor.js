import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'

const created = async function() {
}

const computed = {
	contributorClass() {
		return this.theme + '-contributor-' + this.themeVariety
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	}
}

const watch = {
	displayContributorDialog() {
		this.dcd = this.displayContributorDialog
	},
	contributorName() {
		this.cn = this.contributorName
	},
	dataLicense() {
		this.dl = this.dataLicense
	},
	dcd() {
		this.$emit('setContributorDialogVisible', this.dcd)
	},
	cn() {
		this.$emit('setContributorName', this.cn)
	},
	dl() {
		this.$emit('setDataLicense', this.dl)
	}
}

const mounted = async function() {
	this.cn = this.contributorName
	this.dl = this.dataLicense
}

const methods = {
	signCidRequest() {
		this.$emit('signCidRequest', {
			cid: this.contributionCid,
			dataLicense: this.dataLicense,
			contributorName: this.contributorName,
			notes: this.notes
		})
		this.dcd = false
	}
}

const destroyed = function() {
}

export default {
	props: [
		'displayContributorDialog',
		'contributorName',
		'dataLicense',
		'contributionCid'
	],
	mixins: [
	],
	components: {
		Dialog,
		Button,
		InputText,
		Textarea,
		Dropdown
	},
	directives: {
	},
	name: 'Contributor',
	data () {
		return {
			licenseOptions: [
				"CC0 (No Rights Reserved, Public Domain)",
				"CC-BY (Attribution)",
				"CC BY-SA (Attribution-ShareAlike)",
				"CC BY-NC (Attribution-NonCommercial)",
				"Reserved"
			],
			dcd: false,
			cn: null,
			dl: null,
			notes: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
