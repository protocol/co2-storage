<template>
	<section :class="templatesClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(cp) => {selectedAddress = cp}"
			@refresh="() => {refresh = true}"
			@walletError="(error) => {walletError = error}" />
		<div class="heading"
			v-if="selectedAddress != null">{{ $t("message.schemas.search-existing-environmental-asset-templates") }}</div>
		<div class="existing-schemas"
			v-if="selectedAddress != null">
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
							<i class="pi pi-verified icon-floating-left verified link"
								v-if="data.template.signature"
								@click.stop="printSignature(data.template)"
								v-tooltip.bottom="$t('message.dashboard.body.signed-by', {by: (data.template.signature_account) ? data.template.signature_account : ''})" />
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
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.template.content_cid"
								@click.stop="externalUrl(`${ipldExplorerUrl}${data.template.content_cid}`)">{{ data.template.content_cid }}</div>
							<input type="hidden" :value="data.template.content_cid" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.template.content_cid">
								</i>
							</div>
						</div>
						<div class="in-line">
							<i class="pi pi-box icon-floating-left" />
							<div class="cut link"
								v-tooltip.top="data.block"
								@click.stop="externalUrl(`${ipldExplorerUrl}${data.block}`)">{{ data.block }}</div>
							<input type="hidden" :value="data.block" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.block">
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
			</DataTable>
		</div>
		<div class="heading"
			v-if="selectedAddress && !formVisible">
			<Button :label="$t('message.schemas.create-new-template')" icon="pi pi-cloud-upload" class="p-button-success"
				@click="formVisible = !formVisible" />
		</div>
		<div 
			v-if="formVisible">
			<div class="heading"
				v-if="selectedAddress != null">{{ $t('message.schemas.create-environmental-asset-template') }}</div>
			<div class="schema-name"
				v-if="selectedAddress != null">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><InputText v-model="templateName" :placeholder="$t('message.schemas.environmental-asset-template-name') + ' *'" /></div>
			</div>
			<div class="schema-name"
				v-if="selectedAddress != null">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><InputText v-model="base.title" :placeholder="$t('message.schemas.base-schema')" /></div>
			</div>
			<div class="schema-name"
				v-if="selectedAddress != null">
				<div class="schema-name-label"></div>
				<div class="schema-name-input"><Textarea v-model="templateDescription" :autoResize="false" :placeholder="$t('message.schemas.schema-description')" rows="5" cols="45" /></div>
			</div>
			<div class="schema-name"
				v-if="selectedAddress != null && templateParent != null && isOwner">
				<div class="schema-name-label">{{ $t('message.schemas.create-new-version') }}</div>
				<div class="schema-name-input"><InputSwitch v-model="newVersion" /></div>
			</div>
			<div class="schemas"
				v-if="selectedAddress != null">
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
							@filesError="(sync) => filesError(sync)" />
					</div>
				</div>
			</div>
			<div class="controls"
				v-if="selectedAddress != null">
				<Button :label="$t('message.schemas.create')" icon="pi pi-cloud-upload" class="p-button-success"
					:disabled="templateName == null || !templateName.length"
					@click="addTemplate" />
			</div>
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast position="top-right" />
		<Dialog v-model:visible="displaySignedDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '50vw'}">
			<template #header>
				<h3>{{ $t('message.dashboard.body.signed-cid') }}</h3>
			</template>

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
			</div>
			<div v-else>
				{{signedDialog.error}}
			</div>

			<template #footer>
				<Button label="OK" icon="pi pi-check" autofocus
					@click="displaySignedDialog = false" />
			</template>
		</Dialog>
	</section>
</template>

<script src="@/src/js/templates/templates.js" scoped />
<style src="@/src/scss/templates/templates.scss" lang="scss" scoped />
