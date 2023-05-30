<template>
	<section :class="templatesClass">
		<Header
			@authenticate="async () => { await doAuth() }" />
		<div class="heading">{{ $t("message.schemas.search-existing-environmental-asset-templates") }}</div>
		<div class="existing-schemas">
			<DataTable :value="templates" :lazy="true" :totalRecords="templatesSearchResults" :paginator="true" :rows="templatesSearchLimit"
				@page="templatesPage($event)" responsiveLayout="scroll" :loading="templatesLoading" @row-click="selectTemplate($event.data.block)"
				v-model:filters="templatesFilters" @filter="templatesFilter($event)" filterDisplay="row" @sort="templatesSort($event)"
				paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
				:rowsPerPageOptions="[3,5,10,20,50]"
				>
				<template #header>
					<span class="p-input-icon-left ">
						<i class="pi pi-search" />
						<InputText v-model="templatesFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
					</span>
				</template>
				<template #empty>
					{{ $t("message.schemas.no-asset-templates-found") }}
				</template>
				<template #loading>
					{{ $t("message.schemas.loading-data-wait") }}
				</template>
				<Column field="name" :header="$t('message.schemas.name')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.template.name">{{ data.template.name }}</div>
							<input type="hidden" :value="data.template.name" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.template.name">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-schema-name')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="cid" :header="$t('message.schemas.cid')" :filterMatchModeOptions="templatesMatchModeOptions">
					<template #body="{data}">
						<div class="in-line" :provenanceExists="hasProvenance(data.template.content_cid)">
							<div class="cut link"
								v-tooltip.top="(data.template.content_cid) ? data.template.content_cid : data.template.cid"
								@click.stop="showIpldDialog((data.template.content_cid) ? data.template.content_cid : data.template.cid)">{{ (data.template.content_cid) ? data.template.content_cid : data.template.cid }}</div>
							<input type="hidden" :value="(data.template.content_cid) ? data.template.content_cid : data.template.cid" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="(data.template.content_cid) ? data.template.content_cid : data.template.cid">
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
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="creator" :header="$t('message.schemas.creator')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.template.creator">{{ data.template.creator }}</div>
							<input type="hidden" :value="data.template.creator" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.template.creator">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
<!--
				<Column field="base" :header="$t('message.schemas.base')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="(data.template.base) ? data.template.base : ''">{{ (data.template.base) ? data.template.base : '' }}</div>
							<input type="hidden" :value="(data.template.base) ? data.template.base.title : ''" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="(data.template.base) ? data.template.base.title : ''">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-base-schema')} - ${filterModel.matchMode}`" />
					</template>
				</Column>
			-->
			</DataTable>
		</div>
		<div class="heading"
			v-if="!formVisible">
			<Button :label="$t('message.schemas.create-new-template')" icon="pi pi-cloud-upload" class="p-button-success"
				@click="formVisible = !formVisible" />
		</div>
		<div 
			v-if="formVisible">
			<div class="heading">{{ $t('message.schemas.create-environmental-asset-template') }}</div>
			<div class="schema-name">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><InputText v-model="templateName" :placeholder="$t('message.schemas.environmental-asset-template-name') + ' *'" /></div>
			</div>
			<div class="schema-name">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><InputText v-model="base.title" :placeholder="$t('message.schemas.base-schema')" /></div>
			</div>
			<div class="schema-name">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><Textarea v-model="templateDescription" :autoResize="false" :placeholder="$t('message.schemas.schema-description')" rows="5" cols="45" /></div>
			</div>
			<div class="schema-name"
				v-if="templateParent != null && isOwner">
				<div class="schema-name-label">{{ $t('message.schemas.create-new-version') }}</div>
				<div class="schema-name-input"><InputSwitch v-model="newVersion" /></div>
			</div>
			<div class="schemas">
				<div class="json-editor jse-theme-dark">
					<JsonEditor ref="jsonEditor" :content="jsonEditorContent" :mode="jsonEditorMode"
						@content="((content) => jsonEditorChange(content))"
						@mode="((mode) => jsonEditorModeChange(mode))" />
				</div>
				<div class="form-editor">
					<div class="form-container">
						<FormElements ref="formElements" :form-elements="formElements"
							@filesUploader="(sync) => filesUploader(sync)"
							@filesSelected="(sync) => filesSelected(sync)"
							@filesRemoved="(sync) => filesRemoved(sync)"
							@fileRemoved="(sync) => fileRemoved(sync)"
							@filesError="(sync) => filesError(sync)"
							@fes="(fes) => {formElements = addSubformElements(formElements, fes)}" />
					</div>
				</div>
			</div>
			<div class="controls">
				<Button :label="$t('message.schemas.create')" icon="pi pi-cloud-upload" class="p-button-success"
					:disabled="templateName == null || !templateName.length"
					@click="addTemplate" />
			</div>
		</div>
		<Dialog v-model:visible="displaySignDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
			<template #header>
				<h3>{{ $t('message.dashboard.body.sign-cid') }}</h3>
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
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/templates/templates.js" scoped />
<style src="@/src/scss/templates/templates.scss" lang="scss" scoped />
