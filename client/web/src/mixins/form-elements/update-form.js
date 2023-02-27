const methods = {
	updateForm() {
		if(Array.isArray(this.json))
			return
		this.formElements.length = 0
		const keys = Object.keys(this.json)
		for (const key of keys) {
			const val = this.json[key]
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
				default:
					console.log(`Unknown property type '${type}'`)
					break
			}
			this.formElements.push(domElement)
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
