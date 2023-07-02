import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import FileUpload from 'primevue/fileupload'
import Galleria from 'primevue/galleria'
import ConfirmDialog from 'primevue/confirmdialog'
import Chips from 'primevue/chips'
import Tooltip from 'primevue/tooltip'
import Avatar from 'primevue/avatar'

import Datepicker from '@vuepic/vue-datepicker'

import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'
import delay from '@/src/mixins/delay/delay.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'

import JsonEditor from '@/src/components/helpers/JsonEditor.vue'

import { CID } from 'multiformats/cid'

const created = function() {
}

const computed = {
	formElementsClass() {
		return this.theme + '-form-elements-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	ipfsGatewayUrl() {
		return this.$store.getters['main/getIpfsGatewayUrl']
	},
	ipfs() {
		return this.$store.getters['main/getIpfs']
	}
}

const watch = {
	formElements: {
		async handler() {
			await this.subFormHandler()
		},
		deep: true,
		immediate: true
	}
}

const mounted = function() {
}

const methods = {
    filesUploader($event) {
        this.$emit('files-uploader', $event)
    },
    filesSelected($event, element) {
        this.$emit('files-selected', {event: $event, element: element})
    },
    filesRemoved($event, element) {
        this.$emit('files-removed', {event: $event, element: element})
    },
    fileRemoved($event, element) {
        this.$emit('file-removed', {event: $event, element: element})
    },
    filesError($event, element) {
        this.$emit('files-error', {event: $event, element: element})
    },
	getData(content) {
		let data = null
		try {
			data = ((content != undefined) ? URL.createObjectURL(new Blob(content)) : null)
			this.urls.push(data)
		} catch (error) {
			data = null
		}
		return data
	},
	getImage(content, mime, name, cid, galleryIndex, imageIndex) {
		const data = this.getData(content)
		if(data == null)
			return null

		this.populateGallery(galleryIndex, imageIndex, data, name)

		return data
	},
	populateGallery(galleryIndex, imageIndex, url, name) {
		if(this.galleries[galleryIndex] == undefined)
			this.galleries[galleryIndex] = []
		
		this.galleries[galleryIndex][imageIndex] = {
			src: url,
			alt: name
		}
	},
	openGallery(galleryIndex, imageIndex) {
		this.galleryImageIndex = imageIndex
		this.displayGallery[galleryIndex] = true
	},
	confirmRemovingFile(collection, index) {
		this.$confirm.require({
			message: this.$t("message.form-elements.remove-item-q"),
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				collection.splice(index, 1)
			},
			reject: () => {
				
			},
			onHide: () => {

			}
		})
	},
	async openDocument(file) {
		if(!window.showSaveFilePicker) {
			let bufferBytes = 0
			this.loading = true
			const buffer = await this.fgStorage.getRawData(file.cid, {}, (status) => {
				bufferBytes += status
				this.loadingMessage = this.$t('message.shared.downloading-something', {something: `${this.humanReadableFileSize(bufferBytes)}`})
			})
			this.loading = false
			const data = this.getData(buffer)
			if(data == null)
				return
			
			this.download(data, file.path)
		}
		else {
			await this.openDocumentStream(file.cid, file.path)
		}
	},
	download(data, name) {
		let a
		a = document.createElement('a')
		a.href = data
		a.download = name
		document.body.appendChild(a)
		a.style = 'display: none'
		a.click()
		a.remove()
	},
	openCid(cid) {
		if(cid && cid.toLowerCase() != 'error')
			window.open(`${this.ipfsGatewayUrl}${cid}`, '_blank')
	},
	async openDocumentStream(cid, name) {
		const length = 1000000
		let offset = 0
		let data = []

		try {
			// create a new handle
			const newHandle = await window.showSaveFilePicker({
				suggestedName: name,
			})

			// create a FileSystemWritableFileStream to write to
			const writableStream = await newHandle.createWritable()

			this.loading = true

			while(data) {
				let bufferBytes = 0
				data = await this.fgStorage.getRawData(cid, {offset: offset, length: length}, (status) => {
					bufferBytes = status
				})
				if(!data || !bufferBytes)
					break

				// writes the data to the stream from the determined position
				const blob = new Blob(data)
				await writableStream.write({ type: "write", offset: offset, data: blob })
				offset += bufferBytes
				this.loadingMessage = this.$t('message.shared.downloading-something', {something: `${this.humanReadableFileSize(offset)}`})
			}

			// close the file and write the contents to disk.
			await writableStream.close()
			this.loading = false
			
		} catch (error) {
			console.log(error)			
		}
	},
	// Json editor onChange event handler
	formElementsJsonEditorChange(change, key) {
		if(!this.formElementsJsonEditorMode[key])
			this.formElementsJsonEditorMode[key] = 'code'
		switch (this.formElementsJsonEditorMode[key]) {
			case 'code':
				this.formElementsJsonEditorContent[key] = {
					text: change.updatedContent.text,
					json: null
				}
				if(this.isValidJson(change.updatedContent.text))
					return JSON.parse(change.updatedContent.text)
				break
			case 'tree':
				this.formElementsJsonEditorContent[key] = {
					json: change.updatedContent.json,
					text: null
				}
				return JSON.parse(JSON.stringify(change.updatedContent.json))
//				break
			default:
				console.log(`Unknown JSON editor mode '${this.formElementsJsonEditorMode[key]}'`)
				break
		}
	},
	// Json editor onChangeMode event handler
	formElementsJsonEditorModeChange(mode, key) {
		this.formElementsJsonEditorMode[key] = mode
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
	// Subform handler
	async subFormHandler() {
		if(!this.formElements || !this.formElements.length)
			return

		try {
			// Find Schema/Template elements (if any)
			const schemaElements = this.formElements.filter((el)=>{return el.type == 'Template' || el.type == 'TemplateList'})
			for await (const schemaElement of schemaElements) {
				if(typeof schemaElement.value != 'string')
					continue
				while(!this.ipfs) {
					await this.delay(100)
				}
				const jsonTemplateDefDag = await this.ipfs.dag.get(CID.parse(schemaElement.value))
				let jsonTemplateDef = jsonTemplateDefDag.value
				jsonTemplateDef = this.normalizeSchemaFields(jsonTemplateDef)
				if(schemaElement.type == 'Template') {
					this.subformElements[schemaElement.name] = this.updateForm(jsonTemplateDef, schemaElement.name)
					this.$emit('fes', {key: schemaElement, items: this.subformElements[schemaElement.name], occurences: 1})
				}
				else if(schemaElement.type == 'TemplateList') {
					if(this.formElementsListOccurrences[schemaElement.name] == undefined)
						this.formElementsListOccurrences[schemaElement.name] = 1
					this.subformElements[schemaElement.name] = this.updateForm(jsonTemplateDef, schemaElement.name)
					this.$emit('fes', {key: schemaElement, items: this.subformElements[schemaElement.name], occurences: this.formElementsListOccurrences[schemaElement.name]})
				}
			}
		} catch (error) {
//			console.log(error)				
		}
	},
	// Inc/Dec number of form elements in a list
	nivFormElements(key, items, niv) {
		if(!niv)
			niv = 1
		if(this.formElementsListOccurrences[key.name] == undefined)
			this.formElementsListOccurrences[key.name] = 1
		if(this.formElementsListOccurrences[key.name] + niv < 1)
			this.formElementsListOccurrences[key.name] = 1
		else
			this.formElementsListOccurrences[key.name] += niv
		this.$emit('fes', {key: key, items: items, occurences: this.formElementsListOccurrences[key.name]})
	}
}

const destroyed = function() {
	for (const url of this.urls) {
		URL.revokeObjectURL(url)
	}
}

export default {
    props: [
        'formElements'
    ],
	mixins: [
		copyToClipboard,
		updateForm,
		normalizeSchemaFields,
		delay,
		humanReadableFileSize
	],
	components: {
		InputText,
		InputNumber,
		Dropdown,
		MultiSelect,
		Textarea,
		InputSwitch,
		FileUpload,
		Galleria,
		ConfirmDialog,
		Datepicker,
		Chips,
		Avatar,
		JsonEditor,
		LoadingBlocker
	},
	directives: {
		Tooltip
	},
	name: 'FormElements',
	data () {
		return {
			urls: [],
			galleries: {},
			galleryImageIndex: 0,
			displayGallery: {},
			galleryResponsiveOptions: [
				{
					breakpoint: '1500px',
					numVisible: 7
				},
				{
					breakpoint: '1024px',
					numVisible: 5
				},
				{
					breakpoint: '768px',
					numVisible: 3
				},
				{
					breakpoint: '560px',
					numVisible: 1
				}
			],
			subformElements: {},
			formElementsJsonEditorContent: {},
			formElementsJsonEditorMode: {},
			formElementsListOccurrences: {},
			loading: false,
			loadingMessage: ''
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
