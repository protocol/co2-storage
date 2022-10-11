<template>
	<section :class="templatesClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(cp) => {selectedAddress = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="heading"
			v-if="selectedAddress != null">{{ $t("message.assets.select-environmental-asset-template") }}</div>
		<div class="existing-schemas"
			v-if="selectedAddress != null">
			<DataTable :value="templates" :paginator="true" :rows="10" responsiveLayout="scroll"
				dataKey="cid" v-model:filters="templatesFilters" filterDisplay="row" :loading="templatesLoading"
				@row-click="setTemplate">
				<template #empty>
					{{ $t("message.assets.no-asset-templates-found") }}
				</template>
				<template #loading>
					{{ $t("message.assets.loading-data-wait") }}
				</template>
				<Column field="creator" :header="$t('message.assets.creator')" :filterMatchModeOptions="templatesMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.creator">{{ data.templateBlock.creator }}</div>
							<input type="hidden" :ref="data.templateBlock.creator" :value="data.templateBlock.creator" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.creator">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="cid" :header="$t('message.assets.cid')" :filterMatchModeOptions="templatesMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.cid"
								@click.stop="externalUrl(`${ipldExplorerUrl}${data.templateBlock.cid}`)">{{ data.templateBlock.cid }}</div>
							<input type="hidden" :ref="data.templateBlock.cid" :value="data.templateBlock.cid" />
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
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="name" :header="$t('message.assets.name')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.name">{{ data.templateBlock.name }}</div>
							<input type="hidden" :ref="data.templateBlock.name" :value="data.templateBlock.name" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.name">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-name')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="base" :header="$t('message.assets.base')" :filterMatchModeOptions="templatesMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.templateBlock.base">{{ data.templateBlock.base }}</div>
							<input type="hidden" :ref="data.templateBlock.base" :value="data.templateBlock.base" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.templateBlock.base">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-base-schema')} - ${filterModel.matchMode}`" />
					</template>
				</Column>
<!--
				<Column field="use" :header="$t('message.assets.used')"
					:sortable="true">
					<template #body="{data}">
						<div class="cut">{{ data.use }}</div>
					</template>
				</Column>
				<Column field="fork" :header="$t('message.assets.forks')"
					:sortable="true">
					<template #body="{data}">
						<div class="cut">{{ data.fork }}</div>
					</template>
				</Column>
-->
			</DataTable>
		</div>
		<div class="heading"
			v-if="selectedAddress != null && template != null">{{ $t("message.assets.create-environmental-asset") }}</div>
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
		<div class="schema-name"
			v-if="selectedAddress != null && template != null && assetBlockCid != null">
			<div class="schema-name-label">{{ $t('message.assets.create-new-version') }}</div>
			<div class="schema-name-input"><InputSwitch v-model="newVersion" /></div>
		</div>
		<div class="schemas"
			v-if="selectedAddress != null && template != null">
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
			<div class="form-helper">
				<div class="field"
					v-if="assetBlockCid">
					<div class="field-name">{{ $t("message.assets.asset-cid") }}</div>
					<div class="field-element">
						<InputText v-model="assetBlockCid" />
					</div>
				</div>
			</div>
		</div>
		<div class="controls"
			v-if="selectedAddress != null && template != null">
			<Button :label="$t('message.assets.create')" icon="pi pi-cloud-upload" class="p-button-success"
				:disabled="assetName == null || !assetName.length"
				@click="addAsset" />
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast />
	</section>
</template>

<script src="@/src/js/assets/assets.js" scoped />
<style src="@/src/scss/assets/assets.scss" lang="scss" scoped />
