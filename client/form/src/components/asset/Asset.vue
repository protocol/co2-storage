
import updateForm from '../../mixins/form-elements/update-form';

<template>
	<section :class="templatesClass">
		<div class="main-container"
			v-if="validatedTemplate && template != null && ipfsChainName != null">
			<div class="grid-container">
				<div class="metadata-container"
					v-if="requireThankYou">
					<div class="heading cut">{{ $t('message.assets.asset-created-thanks') }}</div>
					<div class="in-line align-with-title">
						<div class="cut link"
							@click="requireThankYou = false"
							v-tooltip.top="asset">
							{{ asset }}
						</div>
						<input type="hidden" :ref="asset" :value="asset" />
						<div class="copy">
							<i class="pi pi-copy link"
								@click.stop="copyToClipboard"
								:data-ref="asset">
							</i>
						</div>
					</div>
				</div>
				<div class="controls dispersed"
					v-if="requireThankYou">
					<Button :label="$t('message.shared.create-another')" icon="pi pi-cloud-upload" class="p-button-success"
						:disabled="assetName == null || !assetName.length"
						@click="$router.push(`/${template}?metadata=${requireMetadata}&provenance=${requireProvenance}`)" />
				</div>
				<hr
					v-if="requireThankYou" />
				<div class="form-container">
					<div class="heading in-line"
						v-if="assetName != null">
						<div class="cut"
							v-tooltip.top="assetName">
							{{ assetName }}
						</div>
						<input type="hidden" :ref="assetName" :value="assetName" />
						<div class="copy">
							<i class="pi pi-copy link"
								@click.stop="copyToClipboard"
								:data-ref="assetName">
							</i>
						</div>
					</div>
					<div class="schema-name"
						v-if="assetDescription != null">
						{{ assetDescription }}
					</div>
					<div class="schema-name">
						<FormElements ref="formElements" :form-elements="formElements" :read-only="readOnly"
							@filesUploader="(sync) => filesUploader(sync)"
							@filesSelected="(sync) => filesSelected(sync)"
							@filesRemoved="(sync) => filesRemoved(sync)"
							@fileRemoved="(sync) => fileRemoved(sync)"
							@filesError="(sync) => filesError(sync)"
							@fes="(fes) => {formElements = addSubformElements(formElements, fes)}" />
					</div>
				</div>
				<div class="metadata-container"
					v-if="requireProvenance">
					<div class="heading">{{ $t('message.assets.provenance-info') }}</div>
					<div v-if="!signedDialogs.length" class="align-with-title">
						{{ $t('message.assets.no-provenance-info') }}
					</div>
					<div v-else v-for="(signedDialog, signedDialogIndex) in signedDialogs">
						<div  class="verification-icon">
							<div v-if="!signedDialog.verified">
								<img src="@/assets/unverified.png" style="max-width: 100%;" />
							</div>
							<div v-else >
								<img src="@/assets/verified.png" style="max-width: 100%;" />
							</div>
						</div>
						<div v-if="!signedDialog.error" class="align-with-title">
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
							<p />
							<div class="dialog-row code" rowspan="2" v-if="signedDialog.provenanceMessage"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{signedDialog.provenanceMessageSignature.provenance_message}}</span></div>
							<div rowspan="2" v-if="signedDialog.provenanceMessage"><vue-json-pretty :data="signedDialog.provenanceMessage" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
						</div>
						<div v-else>
							{{signedDialog.error}}
						</div>
						<div v-if="walletNeeded" class="align-with-title space-top-1">
							<div class="announcement">{{ $t('message.shared.install-metamask-and-connect-wallet') }}</div>
							<Button :label="$t('message.main.header.connect-wallet')" icon="pi pi-wallet" class="p-button-success"
								@click="connectWallet" />
						</div>
						<p />
					</div>
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="!validatedTemplate">
			<div class="grid-container">
				<div class="metadata-container">
					<div class="heading">{{ $t('message.assets.checking-asset-validity') }}</div>
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="template == null">
			<div class="grid-container">
				<div class="metadata-container">
					<div class="heading">{{ $t('message.assets.invalid-asset') }}</div>
				</div>
			</div>
		</div>
		<div class="main-container"
			v-else-if="ipfsChainName == null">
			<div class="grid-container">
				<div class="metadata-container">
					<div class="heading">{{ $t('message.assets.invalid-chain-index') }}</div>
				</div>
			</div>
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast />
	</section>
</template>

<script src="@/src/js/asset/asset.js" scoped />
<style src="@/src/scss/asset/asset.scss" lang="scss" scoped />
