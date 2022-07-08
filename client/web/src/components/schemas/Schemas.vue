<template>
	<section :class="schemasClass">
		<div class="json-editor">
			<JsonEditor :content="jsonEditorContent" :mode="jsonEditorMode"
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
				</div>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/schemas/schemas.js" scoped />
<style src="@/src/scss/schemas/schemas.scss" lang="scss" scoped />
