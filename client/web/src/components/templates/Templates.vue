<template>
	<section :class="templatesClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(cp) => {selectedAddress = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="heading"
			v-if="selectedAddress != null">{{ $t("message.schemas.search-existing-environmental-asset-templates") }}</div>
		<div class="existing-schemas"
			v-if="selectedAddress != null">
			<DataTable :value="templates" :paginator="true" :rows="10" responsiveLayout="scroll"
				dataKey="cid" v-model:filters="templatesFilters" filterDisplay="row" :loading="templatesLoading"
				@row-click="setTemplate">
				<template #empty>
					{{ $t("message.schemas.no-asset-templates-found") }}
				</template>
				<template #loading>
					{{ $t("message.schemas.loading-data-wait") }}
				</template>
				<Column field="creator" :header="$t('message.schemas.creator')" :filterMatchModeOptions="templatesMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.creator">{{ data.templateBlock.creator }}</div>
							<input type="hidden" :value="data.templateBlock.creator" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.creator">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="cid" :header="$t('message.schemas.cid')" :filterMatchModeOptions="templatesMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.cid"
								@click.stop="externalUrl(`${ipldExplorerUrl}${data.templateBlock.cid}`)">{{ data.templateBlock.cid }}</div>
							<input type="hidden" :value="data.templateBlock.cid" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.cid">
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
				<Column field="name" :header="$t('message.schemas.name')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.name">{{ data.templateBlock.name }}</div>
							<input type="hidden" :value="data.templateBlock.name" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.name">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-schema-name')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="base" :header="$t('message.schemas.base')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.base">{{ data.templateBlock.base }}</div>
							<input type="hidden" :value="data.templateBlock.base" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.base">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-base-schema')} - ${filterModel.matchMode}`" />
					</template>
				</Column>
				<Column field="use" :header="$t('message.schemas.used')"
					:sortable="true">
					<template #body="{data}">
						<div class="cut">{{ data.use }}</div>
					</template>
				</Column>
				<Column field="fork" :header="$t('message.schemas.forks')"
					:sortable="true">
					<template #body="{data}">
						<div class="cut">{{ data.fork }}</div>
					</template>
				</Column>
			</DataTable>
		</div>
		<div class="heading"
			v-if="selectedAddress != null">{{ $t('message.schemas.create-environmental-asset-template') }}</div>
		<div class="schema-name"
			v-if="selectedAddress != null">
			<div class="schema-name-label"></div>
			<div class="schema-name-input"><InputText v-model="templateName" :placeholder="$t('message.schemas.environmental-asset-template-name') + ' *'" /></div>
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
					<FormElements :form-elements="formElements"
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
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/templates/templates.js" scoped />
<style src="@/src/scss/templates/templates.scss" lang="scss" scoped />
