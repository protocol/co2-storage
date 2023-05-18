
import updateForm from '../../mixins/form-elements/update-form';

<template>
	<section :class="templatesClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(cp) => {selectedAddress = cp}"
			@refresh="() => {refresh = true}"
			@walletError="(error) => {walletError = error}" />

		<div class="heading"
			v-if="selectedAddress != null && template != null">{{ $t("message.assets.create-environmental-asset") }}</div>
		<div class="schema-name"
			v-if="selectedAddress != null && template != null">
			<FormElements ref="formElements" :form-elements="formElements"
				@filesUploader="(sync) => filesUploader(sync)"
				@filesSelected="(sync) => filesSelected(sync)"
				@filesRemoved="(sync) => filesRemoved(sync)"
				@fileRemoved="(sync) => fileRemoved(sync)"
				@filesError="(sync) => filesError(sync)"
				@fes="(fes) => {formElements = addSubformElements(formElements, fes)}" />
		</div>
		<div style="border: 1px solid #ddd; border-radius: 0em; background-color: #eee;">
			<div class="schema-name"
				v-if="selectedAddress != null && template != null">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><InputText v-model="assetName" :placeholder="$t('message.assets.environmental-asset-name') + ' *'" /></div>
			</div>
			<div class="schema-name"
				v-if="selectedAddress != null && template != null">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><Textarea v-model="assetDescription" :autoResize="false" :placeholder="$t('message.assets.asset-description')" rows="5" cols="45" /></div>
			</div>
		</div>
		<div class="controls"
			v-if="selectedAddress != null && template != null">
			<Button :label="$t('message.assets.create')" icon="pi pi-cloud-upload" class="p-button-success"
				:disabled="assetName == null || !assetName.length"
				@click="addAsset" />
		</div>
		<Dialog v-model:visible="displaySignDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
			<template #header>
				<h3>{{ $t('message.dashboard.body.signed-cid') }}</h3>
			</template>

			<div v-if="!signDialog.error">
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.method') }}</div><div class="dialog-cell">{{signDialog.result.method}}</div></div>
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verifying-contract') }}</div><div class="dialog-cell">{{signDialog.result.verifying_contract}}</div></div>
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.chain-id') }}</div><div class="dialog-cell">{{signDialog.result.chain_id}}</div></div>
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signer') }}</div><div class="dialog-cell">{{signDialog.result.contributor_key}}</div></div>
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.cid') }}</div><div class="dialog-cell">{{signDialog.result.payload}}</div></div>
				<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature') }}</div><div class="dialog-cell">{{signDialog.result.signature}}</div></div>
			</div>
			<div v-else>
				{{signDialog.error}}
			</div>

			<template #footer>
				<Button label="OK" icon="pi pi-check" autofocus
					@click="displaySignDialog = false" />
			</template>
		</Dialog>
		<Dialog v-model:visible="displaySignedDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
			<template #header>
				<h3>{{ $t('message.dashboard.body.signatures') }}</h3>
			</template>

			<div v-for="(signedDialog, signedDialogIndex) in signedDialogs">
				<hr />
				<div v-if="!signedDialog.error">
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.method') }}</div><div class="dialog-cell">{{signedDialog.signature_method}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verifying-contract') }}</div><div class="dialog-cell">{{signedDialog.signature_verifying_contract}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.chain-id') }}</div><div class="dialog-cell">{{signedDialog.signature_chain_id}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signer') }}</div><div class="dialog-cell">{{signedDialog.signature_account}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.cid') }}</div><div class="dialog-cell">{{signedDialog.signature_cid}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature') }}</div><div class="dialog-cell"></div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-v') }}</div><div class="dialog-cell">{{signedDialog.signature_v}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-r') }}</div><div class="dialog-cell">{{signedDialog.signature_r}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-s') }}</div><div class="dialog-cell">{{signedDialog.signature_s}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verified') }}</div><div class="dialog-cell">{{signedDialog.verified}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
					<div class="dialog-row code" rowspan="2" v-if="signedDialog.provenanceMessageSignature"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{signedDialog.cid}}</span></div>
					<div rowspan="2" v-if="signedDialog.provenanceMessageSignature"><vue-json-pretty :data="signedDialog.provenanceMessageSignature" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
					<div class="dialog-row code" rowspan="2" v-if="signedDialog.provenanceMessage"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{signedDialog.provenanceMessageSignature.provenance_message}}</span></div>
					<div rowspan="2" v-if="signedDialog.provenanceMessage"><vue-json-pretty :data="signedDialog.provenanceMessage" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
				</div>
				<div v-else>
					{{signedDialog.error}}
				</div>
				<p><hr /></p>
			</div>

			<template #footer>
				<Button label="Close" class="p-button-warning" icon="pi pi-times" autofocus
					@click="displaySignedDialog = false" />
				<Button v-if="!hasMySignature[signedDialogs.map((sd)=>{return sd.reference})[0]]" label="Sign" icon="pi pi-user-edit" autofocus
					@click="sign(signedDialogs.map((sd)=>{return sd.reference})[0]); displaySignedDialog = false" />
			</template>
		</Dialog>
		<Contributor
			@set-contributor-dialog-visible="(visible) => {displayContributorDialog = visible}"
			@set-contributor-name="(name) => {$store.dispatch('main/setFgApiProfileName', name)}"
			@set-data-license="(license) => {$store.dispatch('main/setFgApiProfileDefaultDataLicense', license)}"
			@sign-cid-request="(request) => signRequest(request)"
			:display-contributor-dialog="displayContributorDialog"
			:contributor-name="fgApiProfileName"
			:data-license="fgApiProfileDefaultDataLicense"
			:contribution-cid="contributionCid" />
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast />
	</section>
</template>

<script src="@/src/js/asset/asset.js" scoped />
<style src="@/src/scss/asset/asset.scss" lang="scss" scoped />
