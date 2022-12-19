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
				await window.ethereum.request({ method: "eth_requestAccounts" })
				this.web3 = new Web3(window.ethereum)
				this.wallet = this.web3.currentProvider.selectedAddress.toLowerCase()
                this.error = null
			} catch (error) {
				this.wallet = null
                this.error = {code: 500, message: `Error whilst requesting "eth_requestAccounts" method.`}
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

    accountsChanged(handleAccountsChanged) {
        switch (this.type) {
            case "metamask":
                ethereum.on('accountsChanged', handleAccountsChanged)
                break
            default:
                break
        }
    }

    chainChanged(handleChainChanged) {
        switch (this.type) {
            case "metamask":
                ethereum.on('chainChanged', handleChainChanged)
                break
            default:
                break
        }
    }

    accountDisconnect(handleAccountDisconnect) {
        switch (this.type) {
            case "metamask":
                ethereum.on('disconnect', handleAccountDisconnect)
                break
            default:
                break
        }
    }

    authenticateWithPK() {
        try {
            const provider = `${this.infuraApiHost}${process.env.INFURA_API_KEY}`
            this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
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