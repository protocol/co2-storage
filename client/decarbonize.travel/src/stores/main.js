export default {
	namespaced: true,
	state: {
		theme: 'common',
		themeVariety: 'light',
		themeName: 'Main theme, variety light',
		locale: 'en_GB',
		co2StorageAuthType: 'metamask',
		co2StorageIpfsNodeType: 'client',
//		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/proxy.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/web1.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
//		co2StorageIpfsNodeAddr: (process.env.NODE_ENV == 'production') ? '/dns4/web2.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001',
		ipfs: null,
		mode: 'fg',			// estuary, fg
		selectedAddress: null,
		fgApiToken: null,
		fgStorage: null,
		fgWebUrl: (process.env.NODE_ENV == 'production') ? 'https://co2.storage' : 'http://localhost:3002',
		fgApiUrl: (process.env.NODE_ENV == 'production') ? 'https://web1.co2.storage' : 'http://localhost:3020',
//		fgApiUrl: (process.env.NODE_ENV == 'production') ? 'https://web2.co2.storage' : 'http://localhost:3020',
//		ipfsGatewayUrl: 'https://green.filecoin.space/ipfs/',
		ipfsGatewayUrl: 'https://web1.co2.storage/ipfs/',
//		ipfsGatewayUrl: 'https://web2.co2.storage/ipfs/',
		ipfsChainName: null,
		fgApiProfileDefaultDataLicense: null,
		fgApiProfileName: null,
//		regenRpcEndpoint: (process.env.NODE_ENV == 'production') ? 'https://regen.stakesystems.io:2053' : 'http://public-rpc.regen.vitwit.com:26657',
//		regenRpcEndpoint: (process.env.NODE_ENV == 'production') ? 'http://mainnet.regen.network:26657' : 'http://mainnet.regen.network:26657',
		regenRpcEndpoint: (process.env.NODE_ENV == 'production') ? 'https://regen.chora.io/rpc/' : 'https://regen.chora.io/rpc/',
//		regenRestEndpoint: (process.env.NODE_ENV == 'production') ? 'http://mainnet.regen.network:1317' : 'http://mainnet.regen.network:1317',
		regenRestEndpoint: (process.env.NODE_ENV == 'production') ? 'https://regen.chora.io/rest' : 'https://regen.chora.io/rest',
		regenRegistryServer: (process.env.NODE_ENV == 'production') ? 'https://regen-registry-server.herokuapp.com' : 'http://regen-registry-server.herokuapp.com',
		defaultFunction: (process.env.NODE_ENV == 'production') ? 'bafyreigamkgxinaphtivvgapfg7qbe4do4innzporgphuzszyuvohw5ygu' : 'bafyreic672rvly3wwjx3qlxxlwdeynblomzived6snpnauf6wxyll6znq4'
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
		SET_IPFS(state, ipfs) {
			state.ipfs = ipfs;
		},
		SET_MODE(state, mode) {
			state.mode = mode;
		},
		SET_SELECTED_ADDRESS(state, selectedAddress) {
			state.selectedAddress = selectedAddress;
		},
		SET_FG_STORAGE(state, fgStorage) {
			state.fgStorage = fgStorage;
		},
		SET_FG_WEB_URL(state, fgWebUrl) {
			state.fgWebUrl = fgWebUrl;
		},
		SET_FG_API_URL(state, fgApiUrl) {
			state.fgApiUrl = fgApiUrl;
		},
		SET_FG_API_TOKEN(state, fgApiToken) {
			state.fgApiToken = fgApiToken;
		},
		SET_IPFS_GATEWAY_URL(state, ipfsGatewayUrl) {
			state.ipfsGatewayUrl = ipfsGatewayUrl;
		},
		SET_IPFS_CHAIN_NAME(state, ipfsChainName) {
			state.ipfsChainName = ipfsChainName;
		},
		SET_FG_API_PROFILE_DEFAULT_DATA_LICENSE(state, fgApiProfileDefaultDataLicense) {
			state.fgApiProfileDefaultDataLicense = fgApiProfileDefaultDataLicense;
		},
		SET_FG_API_PROFILE_NAME(state, fgApiProfileName) {
			state.fgApiProfileName = fgApiProfileName;
		},
		SET_REGEN_RPC_ENDPOINT(state, regenRpcEndpoint) {
			state.regenRpcEndpoint = regenRpcEndpoint;
		},
		SET_REGEN_REST_ENDPOINT(state, regenRestEndpoint) {
			state.regenRestEndpoint = regenRestEndpoint;
		},
		SET_REGEN_REGISTRY_SERVER(state, regenRegistryServer) {
			state.regenRegistryServer = regenRegistryServer;
		},
		SET_DEFAULT_FUNCTION(state, defaultFunction) {
			state.defaultFunction = defaultFunction;
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
		setIpfs(context, ipfs) {
			context.commit('SET_IPFS', ipfs);
		},
		setMode(context, mode) {
			context.commit('SET_MODE', mode);
		},
		setSelectedAddress(context, selectedAddress) {
			context.commit('SET_SELECTED_ADDRESS', selectedAddress);
		},
		setFGStorage(context, fgStorage) {
			context.commit('SET_FG_STORAGE', fgStorage);
		},
		setFgWebUrl(context, fgWebUrl) {
			context.commit('SET_FG_WEB_URL', fgWebUrl);
		},
		setFgApiUrl(context, fgApiUrl) {
			context.commit('SET_FG_API_URL', fgApiUrl);
		},
		setFgApiToken(context, fgApiToken) {
			context.commit('SET_FG_API_TOKEN', fgApiToken);
		},
		setIpfsGatewayUrl(context, ipfsGatewayUrl) {
			context.commit('SET_IPFS_GATEWAY_URL', ipfsGatewayUrl);
		},
		setIpfsChainName(context, ipfsChainName) {
			context.commit('SET_IPFS_CHAIN_NAME', ipfsChainName);
		},
		setFgApiProfileDefaultDataLicense(context, fgApiProfileDefaultDataLicense) {
			context.commit('SET_FG_API_PROFILE_DEFAULT_DATA_LICENSE', fgApiProfileDefaultDataLicense);
		},
		setFgApiProfileName(context, fgApiProfileName) {
			context.commit('SET_FG_API_PROFILE_NAME', fgApiProfileName);
		},
		setRegenRpcEndpoint(context, regenRpcEndpoint) {
			context.commit('SET_REGEN_RPC_ENDPOINT', regenRpcEndpoint);
		},
		setRegenRestEndpoint(context, regenRestEndpoint) {
			context.commit('SET_REGEN_REST_ENDPOINT', regenRestEndpoint);
		},
		setRegenRegistryServer(context, regenRegistryServer) {
			context.commit('SET_REGEN_REGISTRY_SERVER', regenRegistryServer);
		},
		setDefaultFunction(context, defaultFunction) {
			context.commit('SET_DEFAULT_FUNCTION', defaultFunction);
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
		getIpfs(state) {
			return state.ipfs;
		},
		getMode(state) {
			return state.mode;
		},
		getSelectedAddress(state) {
			return state.selectedAddress;
		},
		getFGStorage(state) {
			return state.fgStorage;
		},
		getFgWebUrl(state) {
			return state.fgWebUrl;
		},
		getFgApiUrl(state) {
			return state.fgApiUrl;
		},
		getFgApiToken(state) {
			return state.fgApiToken;
		},
		getIpfsGatewayUrl(state) {
			return state.ipfsGatewayUrl;
		},
		getIpfsChainName(state) {
			return state.ipfsChainName;
		},
		getFgApiProfileDefaultDataLicense(state) {
			return state.fgApiProfileDefaultDataLicense;
		},
		getFgApiProfileName(state) {
			return state.fgApiProfileName;
		},
		getRegenRpcEndpoint(state) {
			return state.regenRpcEndpoint;
		},
		getRegenRestEndpoint(state) {
			return state.regenRestEndpoint;
		},
		getRegenRegistryServer(state) {
			return state.regenRegistryServer;
		},
		getDefaultFunction(state) {
			return state.defaultFunction;
		}
	}
}
