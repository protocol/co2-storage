const methods = {
	copyToClipboard(event){
        const that = this
        const content = event.target.getAttribute('data-ref')
        if (!navigator.clipboard){
            this.$refs[content].focus()
            this.$refs[content].select()
            document.execCommand('copy')
            this.$toast.add({
                severity: 'success',
                summary: this.$t("message.mixins.clipboard.copy-to-clipboard.success"),
                detail: this.$t("message.mixins.clipboard.copy-to-clipboard.copied"),
                life: 3000
            })
        }
        else {
            navigator.clipboard.writeText(content).then(
                () => {
                    that.$toast.add({
                        severity: 'success',
                        summary: this.$t("message.mixins.clipboard.copy-to-clipboard.success"),
                        detail: this.$t("message.mixins.clipboard.copy-to-clipboard.copied"),
                        life: 3000
                    })
                })
                .catch(
                () => {
                    that.$toast.add({
                        severity: 'error',
                        summary: 'Error!',
                        detail: this.$t("message.mixins.clipboard.copy-to-clipboard.not-copied"),
                        life: 3000
                    })
            })
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
