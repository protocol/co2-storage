const methods = {
	navigate(path) {
		this.$router.push({ path: path })
	},
	externalUrl(url, target) {
		window.open(url, (target) ? target : "_blank")
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
