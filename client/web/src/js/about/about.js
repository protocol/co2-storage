import language from '@/src/mixins/i18n/language.js'
import Header from '@/src/components/helpers/Header.vue'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	aboutClass() {
		return this.theme + '-about-' + this.themeVariety
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

const mounted = async function() {
}

const watch = {
}

const methods = {
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
	name: 'About',
	data () {
		return {
			currentProvider: null,
			selectedAddress: null,
			walletError: null
		}
	},
	created: created,
	computed: computed,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
