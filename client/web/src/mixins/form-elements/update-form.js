const methods = {
	updateForm(jsonTemplateDef, parent) {
		if(!jsonTemplateDef)
			return []

		let domElements = []
		if(Array.isArray(jsonTemplateDef)) {
			for (const el of jsonTemplateDef) {
				if(Array.isArray(el)) {
					const key = el[0]
					const val = el[1]
					domElements.push(this.setFormFieldType(key, val, parent))
				}
				else {
					const key = Object.keys(el)[0]
					const val = el[key]
					domElements.push(this.setFormFieldType(key, val, parent))
				}
			}
		}
		else {
			const keys = Object.keys(jsonTemplateDef)
			for (const key of keys) {
				const val = jsonTemplateDef[key]
				domElements.push(this.setFormFieldType(key, val, parent))
			}
		}

		return domElements
	},
	setFormFieldType(key, val, parent) {
		let domElement = {}

		let breadcrumbs = (Array.isArray(key)) ? key : [key]
		if(parent != undefined && parent.length) {
			if(Array.isArray(parent)) {
				breadcrumbs = parent.concat(breadcrumbs)
			}
			else {
				breadcrumbs.unshift(parent)
			}
			key = [...breadcrumbs]
		}

		const name = breadcrumbs[breadcrumbs.length-1]

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
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
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
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
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
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
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
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : ''
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'bool':
			case 'boolean':
				domElement.type = 'InputSwitch'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? (val.value.toLowerCase() === 'true') : false
				break
			case 'date':
				domElement.type = 'Date'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'dates':
				domElement.type = 'Dates'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetime':
				domElement.type = 'DateTime'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetimes':
				domElement.type = 'DateTimes'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'daterange':
				domElement.type = 'DateRange'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'datetimerange':
				domElement.type = 'DateTimeRange'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'list':
			case 'array':
				// Multiple or single selection needed
				domElement.type = (val.multiple == true) ? 'MultiSelect' : 'Dropdown'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.options = (val.options != undefined && Array.isArray(val.options)) ? val.options : []
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'documents':
				domElement.type = 'Documents'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'images':
			domElement.type = 'Images'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'bacalhau-url-dataset':
				domElement.type = 'BacalhauUrlDataset'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : {type: 'url-dataset', inputs: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'url-dataset'
				break
			case 'bacalhau-custom-docker-job-with-url-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithUrlInputs'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-with-url-inputs', parameters: '', inputs: [], container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-with-url-inputs'
				break
			case 'bacalhau-custom-docker-job-with-cid-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithCidInputs'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-with-cid-inputs', parameters: '', inputs: [], container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-with-cid-inputs'
				break
			case 'bacalhau-custom-docker-job-without-inputs':
				domElement.type = 'BacalhauCustomDockerJobWithoutInputs'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : {type: 'custom-docker-job-without-inputs', parameters: '', container: '', commands: '', swarm: [], job_uuid: null}
				if((!domElement.value.type))
					domElement.value.type = 'custom-docker-job-without-inputs'
				break
			case 'json':
				domElement.type = 'JSON'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				break
			case 'cid':
			case 'ipld-link':
				domElement.type = 'CID'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'template':
			case 'schema':
				domElement.type = 'Template'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			case 'template-list':
			case 'schema-list':
				domElement.type = 'TemplateList'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : null
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
				break
			default:
				console.log(`Unknown property type '${type}'`)
				domElement.type = 'Textarea'
				domElement.name = name
				domElement.breadcrumbs = breadcrumbs
				domElement.value = (val.value != undefined) ? val.value : ''
				domElement.placeholder = (val.placeholder != undefined) ? val.placeholder : ''
		}
		return domElement
	},
	addSubformElements(formElements, elementsObj) {
		const breadcrumbs = elementsObj['key']['breadcrumbs']
		const type = elementsObj['key']['type']
		const items = elementsObj['items']
		const occurences = elementsObj['occurences']
		this.updateFormElements(breadcrumbs, formElements, items, occurences, type)
		return formElements
	},
	updateFormElements(breadcrumbs, formElements, items, occurences, type) {
		let bcs = [...breadcrumbs]
		if (bcs.length) {
			const breadcrumb = bcs[0]
			bcs.shift()
			let subElements = formElements.filter((el)=>{return el.name == breadcrumb})[0]
			if(type == 'TemplateList') {
				if(occurences == undefined)
					occurences = 1
				if(!Array.isArray(subElements.value))
					subElements.value = []
				const setSize = new Set(items.map((el)=>{return el.name})).size
				let noOfExistingElements = subElements.value.length
				let existingSets = noOfExistingElements / setSize
				if(existingSets > occurences) {
					subElements.value = subElements.value.slice(0, (-1)*(setSize * (existingSets - occurences)))
				}
				else if(existingSets < occurences) {
					for (let i = existingSets; i < occurences; i++) {
						let indexedItems = JSON.parse(JSON.stringify(items))
						indexedItems = indexedItems.map((x)=>{x.index = i; return x})
						subElements.value = subElements.value.concat(JSON.parse(JSON.stringify(indexedItems)))
					}
				}
			}
			else if(type == 'Template') {
				if(typeof subElements.value == 'string') {
					subElements.value = []
					subElements.value = subElements.value.concat(JSON.parse(JSON.stringify(items)))
				}
			}
			this.updateFormElements(bcs, subElements.value, items, occurences, type)
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
