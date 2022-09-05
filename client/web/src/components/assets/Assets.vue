<template>
	<section :class="schemasClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="heading"
			v-if="currentProvider != null">{{ $t("message.assets.select-environmental-asset-template") }}</div>
		<div class="existing-schemas"
			v-if="currentProvider != null">
			<DataTable :value="schemas" :paginator="true" :rows="10" responsiveLayout="scroll"
				dataKey="cid" v-model:filters="schemasFilters" filterDisplay="row" :loading="schemasLoading"
				@row-click="setSchema">
				<template #empty>
					{{ $t("message.assets.no-asset-templates-found") }}
				</template>
				<template #loading>
					{{ $t("message.assets.loading-data-wait") }}
				</template>
				<Column field="creator" :header="$t('message.assets.creator')" :filterMatchModeOptions="schemasMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.creator">{{ data.creator }}</div>
							<input type="hidden" :ref="data.creator" :value="data.creator" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.creator">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="cid" :header="$t('message.assets.cid')" :filterMatchModeOptions="schemasMatchModeOptions">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.cid">{{ data.cid }}</div>
							<input type="hidden" :ref="data.cid" :value="data.cid" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.cid">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="name" :header="$t('message.assets.name')" :filterMatchModeOptions="schemasMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.name">{{ data.name }}</div>
							<input type="hidden" :ref="data.name" :value="data.name" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.name">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-schema-name')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="base" :header="$t('message.assets.base')" :filterMatchModeOptions="schemasMatchModeOptions"
					:sortable="true">
					<template #body="{data}">
						<div class="in-line">
							<div class="cut link"
								v-tooltip.top="data.base">{{ data.base }}</div>
							<input type="hidden" :ref="data.base" :value="data.base" />
							<div class="copy">
								<i class="pi pi-copy"
									@click.stop="copyToClipboard"
									:data-ref="data.base">
								</i>
							</div>
						</div>
					</template>
					<template #filter="{filterModel,filterCallback}">
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.assets.search-by-base-schema')} - ${filterModel.matchMode}`" />
					</template>
				</Column>
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
			</DataTable>
		</div>
		<div class="heading"
			v-if="currentProvider != null && schema != null">{{ $t("message.assets.create-environmental-asset") }}</div>
		<div class="schema-name"
			v-if="currentProvider != null && schema != null">
			<div class="schema-name-label"></div>
			<div class="schema-name-input"><InputText v-model="assetName" :placeholder="$t('message.assets.environmental-asset-name') + ' *'" /></div>
		</div>
		<div class="schemas"
			v-if="currentProvider != null && schema != null">
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
					v-if="assetCid">
					<div class="field-name">{{ $t("message.assets.asset-cid") }}</div>
					<div class="field-element">
						<InputText v-model="assetCid" />
					</div>
				</div>
			</div>
		</div>
		<div class="controls"
			v-if="currentProvider != null && schema != null">
			<Button :label="$t('message.assets.create')" icon="pi pi-cloud-upload" class="p-button-success"
				:disabled="assetName == null || !assetName.length"
				@click="addAsset" />
		</div>
		<Toast />
	</section>
</template>

<script src="@/src/js/assets/assets.js" scoped />
<style src="@/src/scss/assets/assets.scss" lang="scss" scoped />
