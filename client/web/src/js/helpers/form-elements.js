import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import FileUpload from 'primevue/fileupload'
import Galleria from 'primevue/galleria'
import ConfirmDialog from 'primevue/confirmdialog'

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
	}
}

const watch = {
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
	getImage(content, mime, name, cid, galleryIndex, imageIndex) {
		let url = null
		try {
			url = ((content != undefined) ? URL.createObjectURL(new Blob(content, {type: mime})) : null)
			this.populateGallery(galleryIndex, imageIndex, url, name)
			this.urls.push(url)
		} catch (error) {
			url = null
		}
		return url
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
		ConfirmDialog
	},
	directives: {
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
			]
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
