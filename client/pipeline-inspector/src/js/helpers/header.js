import language from '@/src/mixins/i18n/language.js'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	headerClass() {
		return this.theme + '-header-' + this.themeVariety
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
	selectedAddress() {
		return this.$store.getters['main/getSelectedAddress']
	}
}

const watch = {
}

const mounted = async function() {
}

const methods = {
	async account() {
		if(this.selectedAddress == undefined)
			this.$emit('authenticate')
	}
}

const destroyed = function() {
}

export default {
	props: [],
	mixins: [
		language
	],
	components: {
	},
	directives: {
	},
	name: 'Header',
	data () {
		return {
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
