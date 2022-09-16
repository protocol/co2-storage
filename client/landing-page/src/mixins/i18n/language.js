const methods = {
	setLanguage(route){
		try{
			if(route.params['lang'])
				this.$i18n.locale = route.params['lang'];
		}
		catch(e){
			console.log(e);
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
