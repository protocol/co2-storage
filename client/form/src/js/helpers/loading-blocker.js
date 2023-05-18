import ProgressSpinner from 'primevue/progressspinner'

const created = function() {
}

const computed = {
	loadingBlockerClass() {
		return this.theme + '-loading-blocker-' + this.themeVariety
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

const mounted = function() {
}

const methods = {
}

const destroyed = function() {
}

export default {
    props: ['loading', 'message'],
	mixins: [
	],
	components: {
        ProgressSpinner
	},
	directives: {
	},
	name: 'LoadingBlocker',
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
