<template>
	<section :class="schemasClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="heading"
			v-if="currentProvider != null">{{ $t("message.schemas.search-existing-environmental-asset-templates") }}</div>
		<div class="existing-schemas"
			v-if="currentProvider != null">
			<DataTable :value="schemas" :paginator="true" :rows="10" responsiveLayout="scroll"
				dataKey="cid" v-model:filters="schemasFilters" filterDisplay="row" :loading="schemasLoading"
				@row-click="setSchema">
				<template #empty>
					{{ $t("message.schemas.no-asset-templates-found") }}
				</template>
				<template #loading>
					{{ $t("message.schemas.loading-data-wait") }}
				</template>
				<Column field="creator" :header="$t('message.schemas.creator')" :filterMatchModeOptions="schemasMatchModeOptions">
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
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-creator-wallet')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="cid" :header="$t('message.schemas.cid')" :filterMatchModeOptions="schemasMatchModeOptions">
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
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="name" :header="$t('message.schemas.name')" :filterMatchModeOptions="schemasMatchModeOptions"
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
						<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.schemas.search-by-schema-name')} - ${filterModel.matchMode}`"/>
					</template>
				</Column>
				<Column field="base" :header="$t('message.schemas.base')" :filterMatchModeOptions="schemasMatchModeOptions"
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
			v-if="currentProvider != null">{{ $t('message.schemas.create-environmental-asset-template') }}</div>
		<div class="schema-name"
			v-if="currentProvider != null">
			<div class="schema-name-label"></div>
			<div class="schema-name-input"><InputText v-model="schemaName" :placeholder="$t('message.schemas.environmental-asset-template-name') + ' *'" /></div>
		</div>
		<div class="schemas"
			v-if="currentProvider != null">
			<div class="json-editor jse-theme-dark">
				<JsonEditor ref="jsonEditor" :content="jsonEditorContent" :mode="jsonEditorMode"
					@content="((content) => jsonEditorChange(content))"
					@mode="((mode) => jsonEditorModeChange(mode))" />
			</div>
			<div class="form-editor">
				<div class="form-container">
					<div class="field" v-for="(element, elementIndex) in formElements" :key="elementIndex">
						<div class="field-name">{{ element.name }}</div>
						<div class="field-element" v-if="element.type == 'InputNumber'">
							<InputNumber v-model="element.value" mode="decimal" showButtons
								:minFractionDigits="0"
								:maxFractionDigits="0"
								:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
								:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
						</div>
						<div v-if="element.type == 'InputDecimal'">
							<InputNumber v-model="element.value" mode="decimal" showButtons
								:minFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
								:maxFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
								:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
								:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
						</div>
						<div v-if="element.type == 'InputText'">
							<InputText v-model="element.value" />
						</div>
						<div v-if="element.type == 'MultiSelect'">
							<MultiSelect v-model="element.value" :options="element.options" />
						</div>
						<div v-if="element.type == 'Dropdown'">
							<Dropdown v-model="element.value" :options="element.options" />
						</div>
						<div v-if="element.type == 'InputSwitch'">
							<InputSwitch v-model="element.value" />
						</div>
						<div v-if="element.type == 'Textarea'">
							<Textarea v-model="element.value" :autoResize="false" rows="5" cols="30" />
						</div>
						<div v-if="element.type == 'Documents'">
							<FileUpload name="files[]" :customUpload="true" :multiple="true" @uploader="fileUploader">
								<template #empty>
								<p>{{ $t('message.schemas.drag-and-drop-documents') }}</p>
								</template>
							</FileUpload>
						</div>
						<div v-if="element.type == 'Images'">
							<input type="hidden" v-model="element.value" :id="`images-v-model-${elementIndex}`" :ref="`images-v-model-${elementIndex}`" />
							<FileUpload name="files[]" :customUpload="true" :multiple="true" accept="image/*" :id="`images-${elementIndex}`" :ref="`images-${elementIndex}`"
								@uploader="fileUploader"
								@select="filesSelected">
								<template #empty>
								<p>{{ $t('message.schemas.drag-and-drop-images') }}</p>
								</template>
							</FileUpload>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="controls"
			v-if="currentProvider != null">
			<Button :label="$t('message.schemas.create')" icon="pi pi-cloud-upload" class="p-button-success"
				:disabled="schemaName == null || !schemaName.length"
				@click="addSchema" />
		</div>
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/schemas/schemas.js" scoped />
<style src="@/src/scss/schemas/schemas.scss" lang="scss" scoped />
