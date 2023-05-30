
import updateForm from '../../mixins/form-elements/update-form';

<template>
	<section :class="assetsClass">
		<Header
			@authenticate="async () => { await doAuth() }" />

		<TabView v-model:activeIndex="activeTab">
			<TabPanel :header="$t('message.assets.select-environmental-asset')">
				<div class="existing-schemas">
					<DataTable :value="assets" :lazy="true" :totalRecords="assetsSearchResults" :paginator="true" :rows="assetsSearchLimit"
						@page="assetsPage($event)" responsiveLayout="scroll" :loading="assetsLoading" @row-click="selectAsset($event.data.block)"
						v-model:filters="assetsFilters" @filter="assetsFilter($event)" filterDisplay="row" @sort="assetsSort($event)"
						paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
						:rowsPerPageOptions="[3,5,10,20,50]">
						<template #header>
							<span class="p-input-icon-left ">
								<i class="pi pi-search" />
								<InputText v-model="assetsFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
							</span>
						</template>
						<template #empty>
							{{ $t("message.assets.no-assets-found") }}
						</template>
						<template #loading>
							{{ $t("message.assets.loading-data-wait") }}
						</template>
						<Column field="name" :header="$t('message.assets.name')" :filterMatchModeOptions="assetsMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.asset.name">{{ data.asset.name }}</div>
									<input type="hidden" :ref="data.asset.name" :value="data.asset.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.name">
										</i>
									</div>
								</div>
								<div class="in-line record-size"
									v-if="data.asset.size">
									{{ humanReadableFileSize(data.asset.size) }}
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-name')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" :header="$t('message.assets.cid')" :filterMatchModeOptions="assetsMatchModeOptions">
							<template #body="{data}">
								<div class="in-line" :provenanceExists="hasProvenance(data.asset.content_cid)">
									<div class="cut link"
										v-tooltip.top="data.asset.content_cid"
										@click.stop="showIpldDialog(data.asset.content_cid)">{{ data.asset.content_cid }}</div>
									<input type="hidden" :ref="data.asset.content_cid" :value="data.asset.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.content_cid">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.asset.content_cid]"
											@click.stop="sign(data.asset.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.asset.content_cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.asset.content_cid]"
											@click.stop="loadSignatures(data.asset.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
								<div class="in-line" :provenanceExists="hasProvenance(data.asset.cid)">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="showIpldDialog(data.block)">{{ data.block }}</div>
									<input type="hidden" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.asset.cid]"
											@click.stop="sign(data.asset.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.asset.cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.asset.cid]"
											@click.stop="loadSignatures(data.asset.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="creator" :header="$t('message.assets.creator')" :filterMatchModeOptions="assetsMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.asset.creator">{{ data.asset.creator }}</div>
									<input type="hidden" :ref="data.asset.creator" :value="data.asset.creator" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.creator">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
					</DataTable>
				</div>
			</TabPanel>
			<TabPanel :header="$t('message.assets.select-environmental-asset-template')">
				<div class="existing-schemas">
					<DataTable :value="templates" :lazy="true" :totalRecords="templatesSearchResults" :paginator="true" :rows="templatesSearchLimit"
						@page="templatesPage($event)" responsiveLayout="scroll" :loading="templatesLoading" @row-click="selectTemplate($event.data.block)"
						v-model:filters="templatesFilters" @filter="templatesFilter($event)" filterDisplay="row" @sort="templatesSort($event)"
						paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
						:rowsPerPageOptions="[3,5,10,20,50]">
						<template #header>
							<span class="p-input-icon-left ">
								<i class="pi pi-search" />
								<InputText v-model="templatesFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
							</span>
						</template>
						<template #empty>
							{{ $t("message.assets.no-asset-templates-found") }}
						</template>
						<template #loading>
							{{ $t("message.assets.loading-data-wait") }}
						</template>
						<Column field="name" :header="$t('message.assets.name')" :filterMatchModeOptions="templatesMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.template.name">{{ data.template.name }}</div>
									<input type="hidden" :ref="data.template.name" :value="data.template.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.name">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-name')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" :header="$t('message.assets.cid')" :filterMatchModeOptions="templatesMatchModeOptions">
							<template #body="{data}">
								<div class="in-line" :provenanceExists="hasProvenance(data.template.content_cid)">
									<div class="cut link"
										v-tooltip.top="data.template.content_cid"
										@click.stop="showIpldDialog(data.template.content_cid)">{{ data.template.content_cid }}</div>
									<input type="hidden" :ref="data.template.content_cid" :value="data.template.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.content_cid">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.template.content_cid]"
											@click.stop="sign(data.template.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.template.content_cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.template.content_cid]"
											@click.stop="loadSignatures(data.template.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
								<div class="in-line" :provenanceExists="hasProvenance(data.template.cid)">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="showIpldDialog(data.block)">{{ data.block }}</div>
									<input type="hidden" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!data.template.signature && !provenanceExist[data.template.cid]"
											@click.stop="sign(data.template.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.template.name})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="data.template.signature || provenanceExist[data.template.cid]"
											@click.stop="loadSignatures(data.template.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="creator" :header="$t('message.assets.creator')" :filterMatchModeOptions="templatesMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.template.creator">{{ data.template.creator }}</div>
									<input type="hidden" :ref="data.template.creator" :value="data.template.creator" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.creator">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
<!--
						<Column field="base" :header="$t('message.assets.base')" :filterMatchModeOptions="templatesMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.template.base">{{ data.template.base }}</div>
									<input type="hidden" :ref="data.template.base" :value="data.template.base" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.base">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-base-schema')} - ${filterModel.matchMode}`" />
							</template>
						</Column>
-->
					</DataTable>
				</div>
			</TabPanel>
		</TabView>
		<div class="main-container"
			v-if="template != null && ipfsChainName != null">
			<div class="grid-container">
				<div class="form-container">
					<div class="heading"
						v-if="template != null">{{ $t("message.assets.create-environmental-asset") }}</div>
					<div class="schema-name"
						v-if="template != null && assetBlockCid && activeTab == 0">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><InputText v-model="assetBlockCid" readonly /></div>
					</div>
					<div class="schema-name"
						v-if="template != null">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><InputText v-model="assetName" :placeholder="$t('message.assets.environmental-asset-name') + ' *'" /></div>
					</div>
					<div class="schema-name"
						v-if="template != null">
						<div class="schema-name-label"></div>
						<div class="schema-name-input"><Textarea v-model="assetDescription" :autoResize="false" :placeholder="$t('message.assets.asset-description')" rows="5" cols="45" /></div>
					</div>
					<div class="schema-name"
						v-if="template != null && assetBlockCid != null && isOwner">
						<div class="schema-name-label">{{ $t('message.assets.create-new-version') }}</div>
						<div class="schema-name-input"><InputSwitch v-model="newVersion" /></div>
					</div>
					<div class="schema-name"
						v-if="template != null">
						<FormElements ref="formElements" :form-elements="formElements"
							@filesUploader="(sync) => filesUploader(sync)"
							@filesSelected="(sync) => filesSelected(sync)"
							@filesRemoved="(sync) => filesRemoved(sync)"
							@fileRemoved="(sync) => fileRemoved(sync)"
							@filesError="(sync) => filesError(sync)"
							@fes="(fes) => {formElements = addSubformElements(formElements, fes)}" />
					</div>
					<div class="controls"
						v-if="template != null">
						<Button :label="$t('message.assets.create')" icon="pi pi-cloud-upload" class="p-button-success"
							:disabled="assetName == null || !assetName.length"
							@click="addAsset" />
					</div>
				</div>
			</div>
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
				<Button v-if="selectedAddress != null && !hasMySignature[signedDialogs.map((sd)=>{return sd.reference})[0]]" label="Sign" icon="pi pi-user-edit" autofocus
					@click="sign(signedDialogs.map((sd)=>{return sd.reference})[0]); displaySignedDialog = false" />
			</template>
		</Dialog>
		<Dialog v-model:visible="displayIpldDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
			<template #header>
				<h3>{{ $t('message.dashboard.body.ipld') }}</h3>
			</template>

			<div class="dialog-row code" v-if="ipldDialog.payload"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{ipldDialog.cid}}</span></div>
			<div v-if="ipldDialog.payload"><vue-json-pretty :data="ipldDialog.payload" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>

			<template #footer>
				<Button label="OK" icon="pi pi-check" autofocus
					@click="displayIpldDialog = false" />
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

<script src="@/src/js/assets/assets.js" scoped />
<style src="@/src/scss/assets/assets.scss" lang="scss" scoped />
