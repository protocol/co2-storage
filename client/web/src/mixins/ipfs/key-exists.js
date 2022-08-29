const methods = {
	// Check if IPNS key alsready exists
	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
