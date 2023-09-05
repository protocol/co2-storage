const methods = {
	listElementsGroupBy(xs, key) {
		return xs.reduce(function(rv, x) {
		  (rv[x[key]] = rv[x[key]] || []).push(x)
		  return rv
		}, {})
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
