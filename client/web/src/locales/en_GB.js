export default {
	"message": {
		"main": {
			"header": {
				"about": "about",
				"dashboard": "dashboard",
				"templates": "templates",
				"assets": "assets",
				"connect-wallet": "connect wallet"
			},
			"body": {
				"title": "CO2.Storage",
				"sub-title": "Free decentralized storage for Environmental Assets",
				"sub-title-colored": "on IPFS and Filecoin",
				"stats": "stats",
				"view-all-stats": "view all stats",
				"cumulative-uploads": "Cumulative uploads",
				"cumulative-uploads-description": "Total amount of environmental assets stored on the dweb",
				"average-uploads-per-month": "Average uploads per month",
				"average-uploads-per-month-description": "Average monthly uploads",
				"cumulative-cids": "Cumulative CIDs",
				"cumulative-cids-description": "Total amount of CIDs created from environmental assets uploads",
				"cumulative-environmental-asset-templates": "Cumulative Environmental Asset Templates",
				"cumulative-environmental-asset-templates-description": "Total amount of templates created from environmental assets uploads"
			}
		},
		"dashboard": {
			"body": {
				"my-environmental-assets": "My Environmental Assets",
				"my-environmental-assets-description": "List of Environmental Assets I've uplaoded",
				"my-environmental-asset-templates": "My Environmental Asset Templates",
				"my-environmental-asset-templates-description": "List of Environmental Asset Templates  I've uplaoded",
				"no-assets-found": "No environmental assets found.",
				"no-asset-templates-found": "No environmental asset templates found.",
				"loading-data-wait": "Loading data. Please wait.",
				"name": "Name",
				"cid": "CID",
				"search-by-schema-cid": "Search by template CID",
				"search-by-schema-name": "Search by template name",
				"search-by-asset-cid": "Search by asset CID",
				"search-by-asset-name": "Search by asset name"
			}
		},
		"about": {
			"body": {
				"title": "CO2.Storage",
				"sub-title": "Free decentralized storage for Environmental Assets",
				"sub-title-colored": " on IPFS and Filecoin",
				"about-description": "The Filecoin Green team is developing CO2.Storage in recognition that industry practitioners would benefit from an upload utility for environmental assets based on standardized data schemas.",
				"about-description-1": "This recognition stemmed from conversations with various stakeholders in the traditional and web3 carbon markets space. This project is the continuation of the idea posted in the Filecoin Green Tools repo:",
				"about-description-2": "This data upload utility maps inputs to base data schemas",
				"about-description-3": "for off-chain data (like metadata, images, attestation documents, and other assets) to promote the development of standard data schemas for environmental assets.",
				"about-description-4": "With IPLD DAGs, data is content addressed using IPFS, meaning the URI pointing to a piece of data (“ipfs://…”) is completely unique to that data (using a", 
				"about-description-5": ", or CID). CIDs can be used for environmental assets and metadata to ensure the asset forever actually refers to the intended data (eliminating things like double counting, and making it trustlessly verifiable what content an asset is associated with). These standard, content addressed, data schemas will also enable more seamless cross-referencing for missing data and meta-analysis of different assets/credits, as well as help expedite the development of new forms of methodologies, supply, and marketplaces.",
				"about-description-6": "This project should be considered pre-alpha, and we are actively seeking input from industry participants and interested parties. We encourage everyone to reach out to our team if this topic is of interest to you:",
				"about-description-7": "Made by the", 
				"about-description-8": "team"
				
				
			}

		},
		"assets": {
			"select-environmental-asset-template": "Select Environmental Asset Template",
			"no-asset-templates-found": "No environmental asset templates found.",
			"loading-data-wait": "Loading data. Please wait.",
			"search-by-creator-wallet": "Search by creator wallet",
			"search-by-schema-cid": "Search by template CID",
			"search-by-schema-name": "Search by template name",
			"search-by-base-schema": "Search by base schema",
			"create-environmental-asset": "Create Environmental Asset",
			"environmental-asset-name": "Environmental asset name",
			"asset-cid": "Asset CID",
			"creator": "Creator",
			"cid": "CID",
			"name": "Name",
			"base": "Base",
			"used": "Used",
			"forks": "Forks",
			"search-by-creator-wallet": "Search by creator wallet",
			"search-by-schema-cid": "Search by template CID",
			"search-by-schema-name": "Search by template name",
			"search-by-base-schema": "Search by base schema",
			"create": "Create",
			"adding-images-and-documents-to-ipfs": "Adding Images and Documents to IPFS",
			"creating-asset": "Creating asset",
			"empty-asset": "Empty asset",
			"enter-environmental-asset-data": "Please enter environmental asset data",
			"asset-created": "Environmental asset is created! Updating chained data structures.",
			"generic-asset-name": "Asset based on {template} template created by {wallet}"
		},
		"schemas": {
			"search-existing-environmental-asset-templates": "Search existing environmental asset templates",
			"no-asset-templates-found": "No environmental asset templates found.",
			"loading-data-wait": "Loading data. Please wait.",
			"search-by-creator-wallet": "Search by creator wallet",
			"search-by-schema-cid": "Search by template CID",
			"search-by-schema-name": "Search by template name",
			"search-by-base-schema": "Search by base schema",
			"creator": "Creator",
			"cid": "CID",
			"name": "Name",
			"base": "Base",
			"used": "Used",
			"forks": "Forks",
			"create-environmental-asset-template": "Create or clone environmental asset template",
			"environmental-asset-template-name": "Environmental asset template name",
			"create": "Create",
			"drag-and-drop-documents": "Drag and drop documents to here to upload.",
			"drag-and-drop-images": "Drag and drop images to here to upload.",
			"upload-not-allowed": "Uploading is not allowed",
			"upload-not-allowed-description": "Uploading is not allowed when creating a template.",
			"empty-schema": "Empty schema",
			"empty-schema-definition": "Please add environmental asset template definition",
			"template-created": "Environmental asset template is created! Updating chained data structures.",
			"new-schema": "New schema",
			"adding-new-schema": "Adding a new template. Please wait.",
			"loading-schema": "Loading template. Please wait."
		},
		"form-elements": {
			"remove-item-q": "Are you sure you want to remove this item?"
		},
		"mixins": {
			"clipboard": {
				"copy-to-clipboard": {
					"success": "Success!",
					"error": "Error!",
					"copied": "Content is copied to clipboard!",
					"not-copied": "Content is NOT copied to clipboard!"
				}
			}
		},
		"shared": {
			"initial-loading": "Please wait for the data structures to be initialized. This may take a few seconds if you are connecting the wallet for the first time.",
			"wallet-not-connected": "Wallet not connected",
			"wallet-not-connected-description": "Please connect your wallet in order to see your environmental assets and templates.",
			"created": "Created",
			"chained-data-updated": "Chained data updated",
			"chained-data-updated-description": "Chained data structures are successfully updated",
			"loading-something": "Loading {something}",
			"error": "Error"
		}
	}
}
