export default {
	namespaced: true,
	state: {
		theme: 'common',
		themeVariety: 'dark',
		locale: 'en_GB',
		walletChain: null
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
		}
	}
}
