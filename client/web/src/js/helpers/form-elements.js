import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import FileUpload from 'primevue/fileupload'

const created = function() {
}

const computed = {
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
    }
}

const destroyed = function() {
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
		FileUpload
	},
	directives: {
	},
	name: 'FormElements',
	data () {
		return {
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
