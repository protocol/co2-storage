const methods = {
	humanReadableFileSize(bytes){
		if(bytes < 1024) {
			return `${bytes} bytes`
		}
		else if(bytes < 1024*1024) {
			return `${Math.round(bytes/1024)} kB`
		}
		else if(bytes < 1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024))} MB`
		}
		else if(bytes < 1024*1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024*1024))} GB`
		}
		else if(bytes < 1024*1024*1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024*1024*1024))} TB`
		}
		else if(bytes < 1024*1024*1024*1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024*1024*1024*1024))} PB`
		}
		else if(bytes < 1024*1024*1024*1024*1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024*1024*1024*1024*1024))} EB`
		}
		else if(bytes < 1024*1024*1024*1024*1024*1024*1024*1024) {
			return `${Math.round(bytes/(1024*1024*1024*1024*1024*1024*1024))} ZB`
		}
		else {
			return `${Math.round(bytes/(1024*1024*1024*1024*1024*1024*1024*1024))} YB`
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
