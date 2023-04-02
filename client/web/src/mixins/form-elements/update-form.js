const methods = {
	updateForm(jsonTemplateDef) {
		if(!jsonTemplateDef)
			return []

		this.domElements.length = 0

		if(Array.isArray(jsonTemplateDef)) {
			for (const el of jsonTemplateDef) {
				if(Array.isArray(el)) {
					const key = el[0]
					const val = el[1]
					this.setFormFieldType(key, val)
				}
				else {
					const key = Object.keys(el)[0]
					const val = el[key]
					this.setFormFieldType(key, val)
				}
			}
		}
		else {
			const keys = Object.keys(jsonTemplateDef)
			for (const key of keys) {
				const val = jsonTemplateDef[key]
				this.setFormFieldType(key, val)
			}
		}

		return this.domElements
	},
	setFormFieldType(key, val) {
		let domElement = {}

		const type = val.type
		switch (type) {
			case 'int':
			case 'integer':
				domElement.type = 'InputNumber'
				// Check do we have min/max boudaries set
				if(val.min != undefined) {
					// Min set
					domElement.min = parseInt(val.min)
				}
				if(val.max != undefined) {
					// Max set
					domElement.max = parseInt(val.max)
				}
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : 0
				break
			case 'decimal':
			case 'float':
				domElement.type = 'InputDecimal'
				// Fraction digits set
				domElement.fractionDigits = ((val.fractionDigits != undefined)) ? parseInt(val.fractionDigits) : 2

				// Check do we have min/max boudaries set
				if(val.min != undefined) {
					// Min set
					domElement.min = parseFloat(val.min)
				}
				if(val.max != undefined) {
					// Max set
					domElement.max = parseFloat(val.max)
				}
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : 0.0
				break
			case 'str':
			case 'string':
				domElement.type = 'InputText'
				// Check do we have min/max boudaries set
				if(val.min != undefined) {
					// Min characters
					domElement.min = parseInt(val.min)
				}
				if(val.max != undefined) {
					// Max characters
					domElement.max = parseInt(val.max)
				}
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : ''
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'txt':
			case 'text':
			case 'textarea':
				domElement.type = 'Textarea'
				// Check do we have min/max boudaries set
				if(val.min != undefined) {
					// Min characters
					domElement.min = parseInt(val.min)
				}
				if(val.max != undefined) {
					// Max characters
					domElement.max = parseInt(val.max)
				}
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : ''
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'bool':
			case 'boolean':
				domElement.type = 'InputSwitch'
				domElement.name = key
				domElement.value = (val.value != undefined) ? (val.value.toLowerCase() === 'true') : false
				break
			case 'date':
				domElement.type = 'Date'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'dates':
				domElement.type = 'Dates'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetime':
				domElement.type = 'DateTime'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetimes':
				domElement.type = 'DateTimes'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'daterange':
				domElement.type = 'DateRange'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetimerange':
				domElement.type = 'DateTimeRange'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'list':
			case 'array':
				// Multiple or single selection needed
				domElement.type = (val.multiple == true) ? 'MultiSelect' : 'Dropdown'
				domElement.name = key
				domElement.options = (val.options != undefined && Array.isArray(val.options)) ? val.options : []
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'documents':
				domElement.type = 'Documents'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'images':
			domElement.type = 'Images'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'bacalhau-url-dataset':
				domElement.type = 'BacalhauUrlDataset'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : {type: 'url-dataset', inputs: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'url-dataset'
				break
			case 'bacalhau-custom-docker-job-with-url-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithUrlInputs'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-with-url-inputs', parameters: '', inputs: [], container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-with-url-inputs'
				break
			case 'bacalhau-custom-docker-job-with-cid-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithCidInputs'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-with-cid-inputs', parameters: '', inputs: [], container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-with-cid-inputs'
				break
			case 'bacalhau-custom-docker-job-without-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithoutInputs'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-without-inputs', parameters: '', container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-without-inputs'
				break
			case 'json':
				domElement.type = 'JSON'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'cid':
			case 'ipld-link':
				domElement.type = 'CID'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'template':
			case 'schema':
				domElement.type = 'Template'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			default:
				console.log(`Unknown property type '${type}'`)
				domElement.type = 'Textarea'
				domElement.name = key
				domElement.value = (val.value != undefined) ? val.value : ''
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
		}
		this.domElements.push(domElement)
	}
}

export default {
	data () {
		return {
			domElements: []
		}
	},
	methods: methods
}
