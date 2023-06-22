const methods = {
	syncFormFiles(sync) {
		const event = sync.event
		let element = sync.element
		if(!element.value)
			element.value = []
		else
			element.value = element.value.filter((v) => {return v.existing})
		
		if(event != undefined && event.files != undefined)
			for (const file of event.files) {
				const existingFilenames = element.value.map((v) => {return v.path})
				if(!element.value.existing && existingFilenames.indexOf(`/${file.name}`) == -1 && existingFilenames.indexOf(file.name) == -1)
					element.value.push({
						path: `/${file.name}`,
						content: file
					})
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
