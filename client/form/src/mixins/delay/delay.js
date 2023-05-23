const methods = {
	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
