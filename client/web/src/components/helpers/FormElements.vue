<template>
	<section class="form-elements">
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
				<FileUpload name="files[]" :customUpload="true" :multiple="true"
					@uploader="filesUploader"
					@select="filesSelected($event, element)"
					@clear="filesRemoved($event, element)"
					@remove="fileRemoved($event, element)"
					@error="filesError($event, element)"> 
					<template #empty>
					<p>{{ $t('message.schemas.drag-and-drop-documents') }}</p>
					</template>
				</FileUpload>
				<div class="existing-documents" v-for="(ed, edIndex) in element.value" :key="edIndex">
					{{ ed.path }}
				</div>
			</div>
			<div v-if="element.type == 'Images'">
				<FileUpload name="files[]" :customUpload="true" :multiple="true" accept="image/*" :showUploadButton="false"
					@uploader="filesUploader"
					@select="filesSelected($event, element)"
					@clear="filesRemoved($event, element)"
					@remove="fileRemoved($event, element)"
					@error="filesError($event, element)">
					<template #empty>
					<p>{{ $t('message.schemas.drag-and-drop-images') }}</p>
					</template>
				</FileUpload>
				<div class="existing-images" v-for="(ei, eiIndex) in element.value" :key="eiIndex">
					{{ ei.path }}
				</div>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/helpers/form-elements.js" scoped />
<style src="@/src/scss/helpers/form-elements.scss" lang="scss" scoped />
