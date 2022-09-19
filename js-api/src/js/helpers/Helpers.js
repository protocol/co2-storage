export class Helpers {

    constructor() {
    }

	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	}
}