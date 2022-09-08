<template>
	<section :class="formElementsClass">
		<div class="field" v-for="(element, elementIndex) in formElements" :key="elementIndex">
			<div class="field-name">{{ element.name }}</div>
			<div class="field-element" v-if="element.type == 'InputNumber'">
				<InputNumber v-model="element.value" mode="decimal" showButtons
					:minFractionDigits="0"
					:maxFractionDigits="0"
					:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
					:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
			</div>
			<div class="field-element" v-if="element.type == 'InputDecimal'">
				<InputNumber v-model="element.value" mode="decimal" showButtons
					:minFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
					:maxFractionDigits="(element.fractionDigits != undefined) ? element.fractionDigits : 2"
					:min="(element.min != undefined) ? element.min : Number.MIN_SAFE_INTEGER"
					:max="(element.max != undefined) ? element.max : Number.MAX_SAFE_INTEGER" />
			</div>
			<div class="field-element" v-if="element.type == 'InputText'">
				<InputText v-model="element.value" />
			</div>
			<div class="field-element" v-if="element.type == 'MultiSelect'">
				<MultiSelect v-model="element.value" :options="element.options" />
			</div>
			<div class="field-element" v-if="element.type == 'Dropdown'">
				<Dropdown v-model="element.value" :options="element.options" />
			</div>
			<div class="field-element" v-if="element.type == 'InputSwitch'">
				<InputSwitch v-model="element.value" />
			</div>
			<div class="field-element" v-if="element.type == 'Textarea'">
				<Textarea v-model="element.value" :autoResize="false" rows="5" cols="30" />
			</div>
			<div class="field-element" v-if="element.type == 'Documents'">
				<FileUpload name="files[]" :customUpload="true" :multiple="true" :showUploadButton="false"
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
			<div class="field-element" v-if="element.type == 'Images'">
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
		</div>
		<ConfirmDialog />
	</section>
</template>

<script src="@/src/js/helpers/form-elements.js" scoped />
<style src="@/src/scss/helpers/form-elements.scss" lang="scss" scoped />
