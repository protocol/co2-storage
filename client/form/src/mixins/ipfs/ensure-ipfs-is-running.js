import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

const methods = {
	async ensureIpfsIsRunning(fgStorage){
		this.loadingMessage = this.$t('message.shared.initializing-ipfs-node')
		this.loading = true
		const ipfs = await fgStorage.ensureIpfsIsRunning()
		this.$store.dispatch('main/setIpfs', ipfs)
		this.loading = false
		return ipfs
	}
}

export default {
	componentc: {
		LoadingBlocker
	},
	data () {
		return {
			loading: false,
			loadingMessage: ''
		}
	},
	methods: methods
}
