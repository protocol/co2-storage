const methods = {
	listElementsGroupByAsObject(xs, key) {
		return xs.reduce((rv, x) => {
		  (rv[x[key]] = rv[x[key]] || []).push(x)
		  return rv
		}, {})
	},
	listElementsGroupByAsList(xs, key) {
		let list = []
		const obj = this.listElementsGroupByAsObject(xs, key)
		for (const key in obj) {
			if (Object.hasOwnProperty.call(obj, key)) {
				const element = obj[key];
				list.push(element)
			}
		}
		return list
	}
}

export const listElementsGroupBy = {
	data () {
		return {
		}
	},
	methods: methods
}
