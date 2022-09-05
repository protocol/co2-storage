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
					break
				case 'bool':
				case 'boolean':
					domElement.type = 'InputSwitch'
					domElement.name = key
					domElement.value = (val.value != undefined) ? (val.value.toLowerCase() === 'true') : false
					break
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
