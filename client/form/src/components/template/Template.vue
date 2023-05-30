
import updateForm from '../../mixins/form-elements/update-form';

<template>
	<section :class="templatesClass">
		<Header
			@authenticate="async () => { await doAuth(); await init() }" />

		<div class="main-container"
			v-if="validatedTemplate && template != null && ipfsChainName != null">
			<div class="grid-container">
				<div class="metadata-container error"
					v-if="nonEthereumBrowserDetected">
					<div class="heading">{{ $t('message.shared.non-ethereum-browser-detected') }}</div>
					<div class="euthereum-browsers">
						<div class="browser clickable" @click="open('https://metamask.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/metamask-fox.svg" /></div>
						<div class="browser clickable" @click="open('https://brave.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/Brave-logo-color-RGB.svg" /></div>
					</div>
				</div>
				<div class="form-container">
					<div class="heading"
						v-if="templateName != null">{{ templateName }}</div>
					<div class="schema-name"
						v-if="templateDescription != null">{{ templateDescription }}</div>
					<div class="schema-name">
						<FormElements ref="formElements" :form-elements="formElements"
							@filesUploader="(sync) => filesUploader(sync)"
							@filesSelected="(sync) => filesSelected(sync)"
							@filesRemoved="(sync) => filesRemoved(sync)"
							@fileRemoved="(sync) => fileRemoved(sync)"
							@filesError="(sync) => filesError(sync)"
							@fes="(fes) => {formElements = addSubformElements(formElements, fes)}" />
					</div>
				</div>
				<div class="metadata-container"
				v-if="requireMetadata">
					<div class="heading">{{ $t('message.assets.asset-metadata') }}</div>
					<div class="schema-name">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><InputText v-model="assetName" :placeholder="$t('message.assets.environmental-asset-name') + ' *'" /></div>
					</div>
					<div class="schema-name">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><Textarea v-model="assetDescription" :autoResize="false" :placeholder="$t('message.assets.asset-description')" rows="5" cols="45" /></div>
					</div>
				</div>
				<div class="metadata-container"
					v-if="requireProvenance">
					<div class="heading">{{ $t('message.assets.provenance-info') }}</div>
					<div class="schema-name">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><InputText v-model="cn" :placeholder="$t('message.helpers.contributor.name')" /></div>
					</div>
					<div class="schema-name">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><Dropdown v-model="dl" :options="licenseOptions" /></div>
					</div>
					<div class="schema-name">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><Textarea v-model="notes" :placeholder="$t('message.helpers.contributor.notes')" :autoResize="false" rows="5" cols="30" /></div>
					</div>
				</div>
				<div class="controls"
					v-if="!nonEthereumBrowserDetected">
					<Button :label="$t('message.assets.create-environmental-asset')" icon="pi pi-cloud-upload" class="p-button-success"
						:disabled="assetName == null || !assetName.length"
						@click="addAsset" />
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="!validatedTemplate">
			<div class="grid-container">
				<div class="metadata-container error"
					v-if="nonEthereumBrowserDetected">
					<div class="heading">{{ $t('message.shared.non-ethereum-browser-detected') }}</div>
					<div class="euthereum-browsers">
						<div class="browser clickable" @click="open('https://metamask.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/metamask-fox.svg" /></div>
						<div class="browser clickable" @click="open('https://brave.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/Brave-logo-color-RGB.svg" /></div>
					</div>
				</div>
				<div class="metadata-container">
					<div class="heading">{{ $t('message.assets.checking-template-validity') }}</div>
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="template == null">
			<div class="grid-container">
				<div class="metadata-container error"
					v-if="nonEthereumBrowserDetected">
					<div class="heading">{{ $t('message.shared.non-ethereum-browser-detected') }}</div>
					<div class="euthereum-browsers">
						<div class="browser clickable" @click="open('https://metamask.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/metamask-fox.svg" /></div>
						<div class="browser clickable" @click="open('https://brave.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/Brave-logo-color-RGB.svg" /></div>
					</div>
				</div>
				<div class="metadata-container error">
					<div class="heading">{{ $t('message.assets.invalid-template') }}</div>
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="ipfsChainName == null">
			<div class="grid-container">
				<div class="metadata-container error"
					v-if="nonEthereumBrowserDetected">
					<div class="heading">{{ $t('message.shared.non-ethereum-browser-detected') }}</div>
					<div class="euthereum-browsers">
						<div class="browser clickable" @click="open('https://metamask.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/metamask-fox.svg" /></div>
						<div class="browser clickable" @click="open('https://brave.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/Brave-logo-color-RGB.svg" /></div>
					</div>
				</div>
				<div class="metadata-container error">
					<div class="heading">{{ $t('message.assets.invalid-chain-index') }}</div>
				</div>
			</div>
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast />
	</section>
</template>

<script src="@/src/js/template/template.js" scoped />
<style src="@/src/scss/template/template.scss" lang="scss" scoped />
