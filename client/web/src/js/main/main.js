import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	mainClass() {
		return this.theme + '-main-' + this.themeVariety
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
}

const mounted = async function() {
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
	name: 'Main',
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
