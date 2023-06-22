import { JSONEditor } from 'svelte-jsoneditor/dist/jsoneditor.js'

const created = function() {
}

const computed = {
}

const watch = {
}

const mounted = function() {
    this.editor = new JSONEditor({
        target: document.getElementById(this.container),
        props: {
            content: this.content,
            mode: this.mode,
            onChange: (updatedContent, previousContent, patchResult) => {
                // emit content changed event to parent
                this.$emit('content', {updatedContent, previousContent, patchResult})
            },
            onChangeMode: (mode) => {
                // emit mode changed event to parent
                this.$emit('mode', mode)
            }
        }
    })
}

const methods = {
    setContent(updatedContent) {
        if(this.mode == 'code')
            updatedContent.text = JSON.stringify(JSON.parse(updatedContent.text), null, this.indentation)
        this.editor.set(updatedContent)
        this.$emit('content', {updatedContent})
    }
}

const destroyed = function() {
}

export default {
    props: [
        'content',
        'mode'
    ],
	mixins: [
	],
	components: {
        JSONEditor
	},
	directives: {
	},
	name: 'JsonEditor',
	data () {
		return {
            container: 'jsonEditorContainer',
            editor: null,
            indentation: 2
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
