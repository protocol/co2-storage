export default {
	namespaced: true,
	state: {
		theme: 'common',
		themeVariety: 'dark',
		locale: 'en_GB',
		walletChain: null,
		co2StorageAuthType: null,	// default metamask
		co2StorageAddr: null,		// default /ip4/127.0.0.1/tcp/5001 (co2.storage local node: /dns4/rqojucgt.co2.storage/tcp/5002/https)
		co2StorageWalletsKey: null	// default 'co2.storage-wallets'
	},
	mutations: {
		SET_THEME(state, theme) {
			state.theme = theme;
		},
		SET_THEME_VARIETY(state, themeVariety) {
			state.themeVariety = themeVariety;
		},
		SET_LOCALE(state, locale) {
			state.locale = locale;
		},
		SET_WALLET_CHAIN(state, walletChain) {
			state.walletChain = walletChain;
		},
		SET_CO2STORAGE_AUTH_TYPE(state, co2StorageAuthType) {
			state.co2StorageAuthType = co2StorageAuthType;
		},
		SET_CO2STORAGE_ADDR(state, co2StorageAddr) {
			state.co2StorageAddr = co2StorageAddr;
		},
		SET_CO2STORAGE_WALLETS_KEY(state, co2StorageWalletsKey) {
			state.co2StorageWalletsKey = co2StorageWalletsKey;
		}
	},
	actions: {
		setTheme(context, theme) {
			context.commit('SET_THEME', theme);
		},
		setThemeVariety(context, themeVariety) {
			context.commit('SET_THEME_VARIETY', themeVariety);
		},
		setLocale(context, locale) {
			context.commit('SET_LOCALE', locale);
		},
		setWalletChain(context, walletChain) {
			context.commit('SET_WALLET_CHAIN', walletChain);
		},
		setCO2StorageAuthType(context, co2StorageAuthType) {
			context.commit('SET_CO2STORAGE_AUTH_TYPE', co2StorageAuthType);
		},
		setCO2StorageAddr(context, co2StorageAddr) {
			context.commit('SET_CO2STORAGE_ADDR', co2StorageAddr);
		},
		setCO2StorageWalletsKey(context, co2StorageWalletsKey) {
			context.commit('SET_CO2STORAGE_WALLETS_KEY', co2StorageWalletsKey);
		}
	},
	getters: {
		getTheme(state) {
			return state.theme;
		},
		getThemeVariety(state) {
			return state.themeVariety;
		},
		getLocale(state) {
			return state.locale;
		},
		getWalletChain(state) {
			return state.walletChain;
		},
		getCO2StorageAuthType(state) {
			return state.co2StorageAuthType;
		},
		getCO2StorageAddr(state) {
			return state.co2StorageAddr;
		},
		getCO2StorageWalletsKey(state) {
			return state.co2StorageWalletsKey;
		}
	}
}
