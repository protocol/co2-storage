const methods = {
	determineTemplateTypeAndKeys(template){
		let templateKeys = []
		let templateType = 'object'
		if(Array.isArray(template)) {
			// Template is a list
			if(Array.isArray(template[0])) {
				// Template is a list of lists
				templateKeys = template.map((el)=>{return el[0]})
				templateType = 'list_of_lists'
			}
			else {
				// Template is a list of objects
				templateKeys = template.map((el)=>{return Object.keys(el)[0]})
				templateType = 'list_of_objects'
			}
		}
		else {
			// Template is an object
			templateKeys = Object.keys(template)
		}
		return {
			templateType: templateType,
			templateKeys: templateKeys
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
