import Web3 from 'web3'

export class Auth {
    type = "metamask"
    wallet = null
    error = null

    constructor(type) {
        if(type != undefined)
            this.type = type
    }

    async authenticate(type) {
        if(type == undefined)
            type = this.type

        switch (type) {
            case "metamask":
                return await this.authenticateWithMetamask()
            default:
                return {
                    result: null,
                    error: `Unsupported authentication type "${type}".`
                }
        }
    }

    async authenticateWithMetamask() {
		if (window.ethereum) {
			try {
				await window.ethereum.request({ method: "eth_requestAccounts" })
				let web3 = new Web3(window.ethereum)
				this.wallet = web3.currentProvider.selectedAddress
                this.error = null
			} catch (error) {
				this.wallet = null
                this.error = `Error whilst requesting "eth_requestAccounts" method.`
			}
		}
		else {
            this.wallet = null
			this.error = 'Non-Ethereum browser detected. You should consider trying MetaMask!'
		}
        return {
            result: this.wallet,
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
}