const methods = {
	printError(error, duration) {
		if(error != null) {
			if(!duration)
				duration = 3000
			try {
				while(typeof error != 'string') {
					error = error.message || error.error
				}
			} catch (err) {
				this.printError(err)
			}
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: error, life: duration})
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
