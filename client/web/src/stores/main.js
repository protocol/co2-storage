export default {
	namespaced: true,
	state: {
		theme: 'common',
		themeVariety: 'dark',
		themeName: 'Main theme, variety dark',
		locale: 'en_GB',
		co2StorageAuthType: 'metamask',
		co2StorageIpfsNodeType: 'browser',
//		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/proxy.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/web1.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
//		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/web2.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
		mode: 'fg',			// estuary, fg
		estuaryStorage: null,
		fgApiToken: null,
		fgStorage: null,
		fgApiUrl: (process.env.NODE_ENV == 'production') ? 'https://web1.co2.storage' : 'https://green.filecoin.space',
//		fgApiUrl: (process.env.NODE_ENV == 'production') ? 'https://web2.co2.storage' : 'http://localhost:3020',
		ipldExplorerUrl: 'https://explore.ipld.io/#/explore/',
//		ipfsGatewayUrl: 'https://green.filecoin.space/ipfs/',
		ipfsGatewayUrl: 'https://web1.co2.storage/ipfs/',
//		ipfsGatewayUrl: 'https://web2.co2.storage/ipfs/',
		ipfsChainName: 'sandbox'
	},
	mutations: {
		SET_THEME(state, theme) {
			state.theme = theme;
		},
		SET_THEME_VARIETY(state, themeVariety) {
			state.themeVariety = themeVariety;
		},
		SET_THEME_NAME(state, themeName) {
			state.themeName = themeName;
		},
		SET_LOCALE(state, locale) {
			state.locale = locale;
		},
		SET_CO2STORAGE_AUTH_TYPE(state, co2StorageAuthType) {
			state.co2StorageAuthType = co2StorageAuthType;
		},
		SET_CO2STORAGE_IPFS_NODE_TYPE(state, co2StorageIpfsNodeType) {
			state.co2StorageIpfsNodeType = co2StorageIpfsNodeType;
		},
		SET_CO2STORAGE_IPFS_NODE_ADDR(state, co2StorageIpfsNodeAddr) {
			state.co2StorageIpfsNodeAddr = co2StorageIpfsNodeAddr;
		},
		SET_MODE(state, mode) {
			state.mode = mode;
		},
		SET_ESTUARY_STORAGE(state, estuaryStorage) {
			state.estuaryStorage = estuaryStorage;
		},
		SET_FG_STORAGE(state, fgStorage) {
			state.fgStorage = fgStorage;
		},
		SET_FG_API_URL(state, fgApiUrl) {
			state.fgApiUrl = fgApiUrl;
		},
		SET_FG_API_TOKEN(state, fgApiToken) {
			state.fgApiToken = fgApiToken;
		},
		SET_IPLD_EXPLORER_URL(state, ipldExplorerUrl) {
			state.ipldExplorerUrl = ipldExplorerUrl;
		},
		SET_IPFS_GATEWAY_URL(state, ipfsGatewayUrl) {
			state.ipfsGatewayUrl = ipfsGatewayUrl;
		},
		SET_IPFS_CHAIN_NAME(state, ipfsChainName) {
			state.ipfsChainName = ipfsChainName;
		}
	},
	actions: {
		setTheme(context, theme) {
			context.commit('SET_THEME', theme);
		},
		setThemeVariety(context, themeVariety) {
			context.commit('SET_THEME_VARIETY', themeVariety);
		},
		setThemeName(context, themeName) {
			context.commit('SET_THEME_NAME', themeName);
		},
		setLocale(context, locale) {
			context.commit('SET_LOCALE', locale);
		},
		setCO2StorageAuthType(context, co2StorageAuthType) {
			context.commit('SET_CO2STORAGE_AUTH_TYPE', co2StorageAuthType);
		},
		setCO2StorageIpfsNodeType(context, co2StorageIpfsNodeType) {
			context.commit('SET_CO2STORAGE_IPFS_NODE_TYPE', co2StorageIpfsNodeType);
		},
		setCO2StorageIpfsNodeAddr(context, co2StorageIpfsNodeAddr) {
			context.commit('SET_CO2STORAGE_IPFS_NODE_ADDR', co2StorageIpfsNodeAddr);
		},
		setMode(context, mode) {
			context.commit('SET_MODE', mode);
		},
		setEstuaryStorage(context, estuaryStorage) {
			context.commit('SET_ESTUARY_STORAGE', estuaryStorage);
		},
		setFGStorage(context, fgStorage) {
			context.commit('SET_FG_STORAGE', fgStorage);
		},
		setFgApiUrl(context, fgApiUrl) {
			context.commit('SET_FG_API_URL', fgApiUrl);
		},
		setFgApiToken(context, fgApiToken) {
			context.commit('SET_FG_API_TOKEN', fgApiToken);
		},
		setIpldExplorerUrl(context, ipldExplorerUrl) {
			context.commit('SET_IPLD_EXPLORER_URL', ipldExplorerUrl);
		},
		setIpfsGatewayUrl(context, ipfsGatewayUrl) {
			context.commit('SET_IPFS_GATEWAY_URL', ipfsGatewayUrl);
		},
		setIpfsChainName(context, ipfsChainName) {
			context.commit('SET_IPFS_CHAIN_NAME', ipfsChainName);
		}
	},
	getters: {
		getTheme(state) {
			return state.theme;
		},
		getThemeVariety(state) {
			return state.themeVariety;
		},
		getThemeName(state) {
			return state.themeName;
		},
		getLocale(state) {
			return state.locale;
		},
		getCO2StorageAuthType(state) {
			return state.co2StorageAuthType;
		},
		getCO2StorageIpfsNodeType(state) {
			return state.co2StorageIpfsNodeType;
		},
		getCO2StorageIpfsNodeAddr(state) {
			return state.co2StorageIpfsNodeAddr;
		},
		getMode(state) {
			return state.mode;
		},
		getEstuaryStorage(state) {
			return state.estuaryStorage;
		},
		getFGStorage(state) {
			return state.fgStorage;
		},
		getFgApiUrl(state) {
			return state.fgApiUrl;
		},
		getFgApiToken(state) {
			return state.fgApiToken;
		},
		getIpldExplorerUrl(state) {
			return state.ipldExplorerUrl;
		},
		getIpfsGatewayUrl(state) {
			return state.ipfsGatewayUrl;
		},
		getIpfsChainName(state) {
			return state.ipfsChainName;
		}
	}
}
