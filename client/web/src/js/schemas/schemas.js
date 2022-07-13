import language from '@/src/mixins/i18n/language.js'

import JsonEditor from '@/src/components/helpers/JsonEditor.vue'

import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	schemasClass() {
		return this.theme + '-schemas-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	}
}

const watch = {
	json: {
		handler(state, before) {
			if(state)
				this.updateForm()

		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
}

const methods = {
	// Json editor onChange event handler
	jsonEditorChange(change) {
		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: change.updatedContent.text,
					json: null
				}
				if(this.isValidJson(change.updatedContent.text))
					this.json = JSON.parse(change.updatedContent.text)
				break
			case 'tree':
				this.jsonEditorContent = {
					json: change.updatedContent.json,
					text: null
				}
				this.json = JSON.parse(JSON.stringify(change.updatedContent.json))
				break
			default:
				console.log(`Unknown JSON editor mode '${this.jsonEditorMode}'`)
				break
		}
	},
	// Json editor onChangeMode event handler
	jsonEditorModeChange(mode) {
		this.jsonEditorMode = mode
	},
    // Workaround for svelte onError
    isValidJson(input) {
		let str
        try{
			if(typeof input == 'string')
				str = input
			else
				str = JSON.stringify(input) 
            JSON.parse(str);
        }
        catch (e){
            return false
        }
        return true
    },
	// Update for following json is changed and validated
	updateForm() {
		if(Array.isArray(this.json))
			return
			this.formElements.length = 0
		const keys = Object.keys(this.json)
		for (const key of keys) {
			const val = this.json[key]
			let domElement = {}
/*
			// Check first if we have array supplied
			if(Array.isArray(val)) {
				// Check do we need single or multile selection
				const chunks = key.split('::')
				if(chunks[1] != undefined) {
					// Multiple selection needed
					domElement.element = 'MultiSelect'
				}
				else {
					// Single selection needed
					domElement.element = 'Dropdown'
				}
				domElement.name = chunks[0]
				domElement.val = val
				continue
			}
*/
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
				default:
					console.log(`Unknown property type '${type}'`)
					break
			}
			this.formElements.push(domElement)
		}
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
		JsonEditor,
		InputText,
		InputNumber,
		Dropdown,
		MultiSelect,
		Textarea,
		InputSwitch
	},
	directives: {
	},
	name: 'Schemas',
	data () {
		return {
			jsonEditorContent: {
				text: undefined,
				json: {}
			},
			jsonEditorMode: 'tree',
			validJson: false,
			json: null,
			formElements: []
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
