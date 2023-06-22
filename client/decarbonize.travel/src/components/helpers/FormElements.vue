<template>
	<section :class="formElementsClass">
		<div class="field" v-for="(element, elementIndex) in formElements" :key="elementIndex">
			<div class="field-name">{{ element.name }} <span v-if="element.index != undefined">({{ element.index }})</span></div>
			<div class="field-element" v-if="element.type == 'InputNumber'">
				<InputNumber v-model="element.value" mode="decimal" showButtons
					:disabled="readOnly"
					:minFractionDigits="0"
					:maxFractionDigits="0"
					:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
					:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
			</div>
			<div class="field-element" v-else-if="element.type == 'InputDecimal'">
				<InputNumber v-model="element.value" mode="decimal" showButtons
					:disabled="readOnly"
					:minFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
					:maxFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
					:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
					:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
			</div>
			<div class="field-element" v-else-if="element.type == 'InputText'">
				<InputText v-model="element.value" :placeholder="element.placeholder"
					:readOnly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'MultiSelect'">
				<MultiSelect v-model="element.value" :options="element.options"
					:disabled="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'Dropdown'">
				<Dropdown v-model="element.value" :options="element.options"
					:disabled="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'InputSwitch'">
				<InputSwitch v-model="element.value"
					:disabled="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'Textarea'">
				<Textarea v-model="element.value" :placeholder="element.placeholder" :autoResize="false" rows="5" cols="30"
					:disabled="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'Date'">
				<Datepicker v-model="element.value" :enableTimePicker="false" :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'Dates'">
				<Datepicker v-model="element.value" :enableTimePicker="false" multiDates :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'DateTime'">
				<Datepicker v-model="element.value" :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'DateTimes'">
				<Datepicker v-model="element.value" multiDates :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'DateRange'">
				<Datepicker v-model="element.value" range :enableTimePicker="false" :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'DateTimeRange'">
				<Datepicker v-model="element.value" range :placeholder="element.placeholder"
					:readonly="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'Documents'">
				<FileUpload name="files[]" :customUpload="true" :multiple="true" :showUploadButton="false"
					v-if="!readOnly"
					@uploader="filesUploader"
					@select="filesSelected($event, element)"
					@clear="filesRemoved($event, element)"
					@remove="fileRemoved($event, element)"
					@error="filesError($event, element)"> 
					<template #empty>
					<p>{{ $t('message.schemas.drag-and-drop-documents') }}</p>
					</template>
				</FileUpload>
				<div class="existing-documents">
					<div class="existing-document link" v-for="(ed, edIndex) in element.value" :key="edIndex">
						<div v-if="ed.existing" class="existing-document-icon"
							@click="openDocument(ed.content, ed.path)">
							{{ ed.path }}
							<i class="pi pi-trash" @click.stop="confirmRemovingFile(element.value, edIndex)" />
						</div>
					</div>
				</div>
			</div>
			<div class="field-element" v-else-if="element.type == 'Images'">
				<FileUpload name="files[]" :customUpload="true" :multiple="true" accept="image/*" :showUploadButton="false"
					v-if="!readOnly"
					@uploader="filesUploader"
					@select="filesSelected($event, element)"
					@clear="filesRemoved($event, element)"
					@remove="fileRemoved($event, element)"
					@error="filesError($event, element)">
					<template #empty>
					<p>{{ $t('message.schemas.drag-and-drop-images') }}</p>
					</template>
				</FileUpload>
				<div class="existing-images">
					<div class="existing-image" v-for="(ei, eiIndex) in element.value" :key="eiIndex">
						<img v-if="ei.existing" 
							:src="getImage(ei.content, 'iamge/*', ei.path, ei.cid, elementIndex, eiIndex)"
							:alt="ei.path" class="link"
							@click="openGallery(elementIndex, eiIndex)" />
						<i class="pi pi-trash" @click.stop="confirmRemovingFile(element.value, eiIndex)" />
					</div>
				</div>
				<Galleria :value="galleries[elementIndex]" v-model:activeIndex="galleryImageIndex" :responsiveOptions="galleryResponsiveOptions" :numVisible="7"
					:circular="true" :fullScreen="true" :showItemNavigators="true" :showThumbnails="false" v-model:visible="displayGallery[elementIndex]">
					<template #item="slotProps">
						<img :src="slotProps.item.src" :alt="slotProps.item.alt" style="width: 100%; display: block;" />
					</template>
					<template #thumbnail="slotProps">
						<img :src="slotProps.item.src" :alt="slotProps.item.alt" style="display: block;" />
					</template>
				</Galleria>
			</div>
			<div class="field-element" v-else-if="element.type == 'BacalhauUrlDataset'">
				<Chips v-model="element.value.inputs"
					:disabled="readOnly" />
				<div v-if="element.value.job_uuid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-uuid') }}:</div>
					<div class="cut"
						v-tooltip.top="element.value.job_uuid">{{ element.value.job_uuid }}</div>
					<input type="hidden" :ref="element.value.job_uuid" :value="element.value.job_uuid" />
					<div class="copy">
						<i class="pi pi-copy"
							@click.stop="copyToClipboard"
							:data-ref="element.value.job_uuid">
						</i>
					</div>
				</div>
				<div v-if="element.value.job_cid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-cid') }}:</div>
					<div :class="['cut', {'link' : element.value.job_cid.toLowerCase() != 'error' }]"
						v-tooltip.top="element.value.job_cid"
						@click="openCid(element.value.job_cid)">{{ element.value.job_cid }}</div>
					<input type="hidden" :ref="element.value.job_cid" :value="element.value.job_cid" />
					<div class="copy">
						<i class="pi pi-copy"
							@click.stop="copyToClipboard"
							:data-ref="element.value.job_cid">
						</i>
					</div>
				</div>
				<div v-if="!element.value.job_cid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-cid') }}:</div>
					<div>{{ $t('message.form-elements.job-still-running') }}</div>
				</div>
				<Textarea v-if="element.value.message && element.value.message.length" v-model="element.value.message" :autoResize="false" rows="5" cols="30"
					:disabled="readOnly" />
			</div>
			<div class="field-element" v-else-if="element.type == 'BacalhauCustomDockerJobWithUrlInputs'
				|| element.type == 'BacalhauCustomDockerJobWithCidInputs' || element.type == 'BacalhauCustomDockerJobWithoutInputs'">
				<InputText v-model="element.value.parameters" placeholder="Bacalhau docker job parameters"
					:readOnly="readOnly" /><br /><br />
				<Chips placeholder="Job inputs" v-if="element.type == 'BacalhauCustomDockerJobWithUrlInputs' 
					|| element.type == 'BacalhauCustomDockerJobWithCidInputs'" v-model="element.value.inputs"
					:disabled="readOnly" /><br /><br />
				<InputText v-model="element.value.container" placeholder="Bacalhau docker job container"
					:readOnly="readOnly" /><br /><br />
				<InputText v-model="element.value.commands" placeholder="Bacalhau docker job commands"
					:readOnly="readOnly" /><br /><br />
				<Chips placeholder="IPFS swarm" v-model="element.value.swarm"
					:disabled="readOnly" />
				<div v-if="element.value.job_uuid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-uuid') }}:</div>
					<div class="cut"
						v-tooltip.top="element.value.job_uuid">{{ element.value.job_uuid }}</div>
					<input type="hidden" :ref="element.value.job_uuid" :value="element.value.job_uuid" />
					<div class="copy">
						<i class="pi pi-copy"
							@click.stop="copyToClipboard"
							:data-ref="element.value.job_uuid">
						</i>
					</div>
				</div>
				<div v-if="element.value.job_cid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-cid') }}:</div>
					<div :class="['cut', {'link' : element.value.job_cid.toLowerCase() != 'error' }]"
						v-tooltip.top="element.value.job_cid"
						@click="openCid(element.value.job_cid)">{{ element.value.job_cid }}</div>
					<input type="hidden" :ref="element.value.job_cid" :value="element.value.job_cid" />
					<div class="copy">
						<i class="pi pi-copy"
							@click.stop="copyToClipboard"
							:data-ref="element.value.job_cid">
						</i>
					</div>
				</div>
				<div v-if="!element.value.job_cid" class="in-line spaced-rows">
					<div class="title">{{ $t('message.form-elements.job-cid') }}:</div>
					<div>{{ $t('message.form-elements.job-still-running') }}</div>
				</div>
				<Textarea v-if="element.value.message && element.value.message.length" v-model="element.value.message" :autoResize="false" rows="5" cols="30"
					:disabled="readOnly" />
			</div>
			<div class="field-element jse-theme-default" v-else-if="element.type == 'JSON'">
				<JsonEditor v-if="!readOnly"
					:ref="`jsonEditor-${element.name}`" :content="formElementsJsonEditorContent[element.name]" :mode="(formElementsJsonEditorMode[element.name]) ? formElementsJsonEditorMode[element.name] : 'code'"
					@content="((content) => {element.value = formElementsJsonEditorChange(content, element.name)})"
					@mode="((mode) => formElementsJsonEditorModeChange(mode, element.name))" />
				<vue-json-pretty v-if="readOnly"
					:data="element.value" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" />
			</div>
			<div class="field-element jse-theme-default" v-else-if="element.type == 'CID'">
				<InputText v-model="element.value" :placeholder="element.placeholder"
					:readOnly="readOnly" />
			</div>
			<div class="field-element jse-theme-default" v-else-if="element.type == 'Template'">
				<div v-if="element.value">
					<FormElements ref="formElements" :form-elements="formElements.filter((el)=>{return el.name == element.name})[0].value"
						:read-only="readOnly"
						@filesUploader="(sync) => filesUploader(sync)"
						@filesSelected="(sync) => filesSelected(sync)"
						@filesRemoved="(sync) => filesRemoved(sync)"
						@fileRemoved="(sync) => fileRemoved(sync)"
						@filesError="(sync) => filesError(sync)"
						@fes="(fes) => $emit('fes', fes)" />
				</div>
			</div>
			<div class="field-element jse-theme-default" v-else-if="element.type == 'TemplateList'">
					<FormElements ref="formListElements" :form-elements="formElements.filter((el)=>{return el.name == element.name})[0].value"
						:read-only="readOnly"
						@filesUploader="(sync) => filesUploader(sync)"
						@filesSelected="(sync) => filesSelected(sync)"
						@filesRemoved="(sync) => filesRemoved(sync)"
						@fileRemoved="(sync) => fileRemoved(sync)"
						@filesError="(sync) => filesError(sync)"
						@fes="(fes) => $emit('fes', fes)" />
					<Avatar label="-" size="large" style="background-color:#2196F3; color: #ffffff; cursor: pointer"
						@click="nivFormElements(element, formElements.filter((el)=>{return el.name == element.name})[0].value, -1)" />
				<div style="float: right;">
					<Avatar label="+" size="large" style="background-color:#4caf4f; color: #ffffff; cursor: pointer"
						@click="nivFormElements(element, formElements.filter((el)=>{return el.name == element.name})[0].value, 1)" />
				</div>
			</div>
			<div class="field-element" v-else>
				<Textarea v-model="element.value" :placeholder="element.placeholder" :autoResize="false" rows="5" cols="30"
					:disabled="readOnly" />
			</div>
		</div>
		<ConfirmDialog />
	</section>
</template>

<script src="@/src/js/helpers/form-elements.js" scoped />
<style src="@/src/scss/helpers/form-elements.scss" lang="scss" scoped />
