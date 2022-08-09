import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	dashboardClass() {
		return this.theme + '-dashboard-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	}
}

const watch = {
	currentProvider: {
		handler() {
			if(this.currentProvider == null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
			}
			else {
				this.selectedAddress = this.currentProvider.selectedAddress
			}
		},
		deep: true,
		immediate: false
	},
	walletError: {
		handler() {
			if(this.walletError != null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
				// TODO, popup error
			}
		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
}

const methods = {
	navigate(path) {
		this.$router.push({ path: path })
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
		Header
	},
	directives: {
	},
	name: 'Dasboard',
	data () {
		return {
			currentProvider: null,
			selectedAddress: null,
			walletError: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
