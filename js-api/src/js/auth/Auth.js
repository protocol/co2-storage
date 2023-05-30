import Web3 from 'web3'

export class Auth {
    type = "metamask"
    wallet = null
    error = null
    web3 = null
	infuraApiHost = "https://mainnet.infura.io/v3/"

    constructor(type) {
        if(type != undefined)
            this.type = type
    }

    initWeb3() {
        let web3, error
        switch (this.type) {
            case "metamask":
                try {
                    web3 = new Web3(window.ethereum)
                        if(web3 == undefined)
                            throw new Error(`Error whilst trying to initialize web3.`)
                    error = null
                } catch (error) {
                    error = {code: 500, message: `Error whilst trying to initialize web3.`}
                    web3 = null
                }
                return {
                    error: error,
                    web3: web3
                }
            case "pk":
                try {
                    const provider = `${this.infuraApiHost}${process.env.INFURA_API_KEY}`
                    web3 = new Web3(new Web3.providers.HttpProvider(provider))
                    error = null
                } catch (error) {
                    error = {code: 500, message: `Error whilst trying to initialize web3.`}
                    web3 = null
                }
                return {
                    error: error,
                    web3: web3
                }
            default:
                return {
                    error: `Unsupported authentication type "${this.type}".`,
                    web3: null
                }
        }
    }

    async authenticate() {
        switch (this.type) {
            case "metamask":
                return await this.authenticateWithMetamask()
            case "pk":
                return this.authenticateWithPK()
            default:
                return {
                    result: null,
                    error: `Unsupported authentication type "${this.type}".`,
                    web3: null
                }
        }
    }

    async authenticateWithMetamask() {
		if (window && window.ethereum) {
            try {
                const web3Request = this.initWeb3()
                if(web3Request.error)
                    throw new Error(web3Request.error)
                this.web3 = web3Request.web3
                await window.ethereum.request({ method: "eth_requestAccounts" })
                this.wallet = (await this.web3.eth.getAccounts())[0].toLowerCase()
                this.error = null
            } catch (error) {
                this.wallet = null
                this.error = {code: 500, message: error}
                this.web3 = null
            }
		}
		else {
            this.wallet = null
			this.error = {code: 400, message: 'Non-Ethereum browser detected. You should consider trying MetaMask!'}
            this.web3 = null
		}
        return {
            result: this.wallet,
            web3: this.web3,
            error: this.error
        }
    }

    async connectedAccounts() {
        let accounts
        switch (this.type) {
            case "metamask":
                try {
                    accounts = await ethereum.request({ method: 'eth_accounts' })
                } catch (error) {
                    accounts = null
                }
                break
            case "pk":
                accounts = (this.wallet) ? [this.wallet] : []
                break
            default:
                break
        }
        return accounts
    }

    accountConnect(handleAccountConnect, handleAccountConnectError) {
        switch (this.type) {
            case "metamask":
                try {
                    ethereum.on('connect', handleAccountConnect)
                } catch (error) {
                    if(handleAccountConnectError)
                        handleAccountConnectError(error)           
                }
                break
            default:
                break
        }
    }

    accountsChanged(handleAccountsChanged, handleAccountsChangedError) {
        switch (this.type) {
            case "metamask":
                try {
                    ethereum.on('accountsChanged', handleAccountsChanged)
                } catch (error) {
                    if(handleAccountsChangedError)
                        handleAccountsChangedError(error)           
                }
                break
            default:
                break
        }
    }

    chainChanged(handleChainChanged, handleChainChangedError) {
        switch (this.type) {
            case "metamask":
                try {
                    ethereum.on('chainChanged', handleChainChanged)
                } catch (error) {
                    if(handleChainChangedError)
                        handleChainChangedError(error)
                }
                break
            default:
                break
        }
    }

    accountDisconnect(handleAccountDisconnect, handleAccountDisconnectError) {
        switch (this.type) {
            case "metamask":
                try {
                    ethereum.on('disconnect', handleAccountDisconnect)
                } catch (error) {
                    if(handleAccountDisconnectError)
                        handleAccountDisconnectError(error)
                }
                break
            default:
                break
        }
    }

    authenticateWithPK() {
        try {
            const web3Request = this.initWeb3()
            if(web3Request.error)
                throw new Error(web3Request.error)
            this.web3 = web3Request.web3
            const account = this.web3.eth.accounts.privateKeyToAccount(process.env.PK)
            this.wallet = account.address.toLowerCase()
            this.error = null
        } catch (error) {
            this.wallet = null
            this.error = {code: 500, message: `Error whilst requesting "privateKeyToAccount" method.`}
            this.web3 = null
        }

        return {
            error: this.error,
            result: this.wallet,
            web3: this.web3
        }
    }
}