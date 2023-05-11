<template>
	<section :class="contributorClass">
		<Dialog v-model:visible="dcd" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '50vw'}">
				<template #header>
					<h3>{{ $t('message.helpers.contributor.title') }}</h3>
				</template>

				<div class="contributor-field-element">
					<InputText v-model="cn" :placeholder="$t('message.helpers.contributor.name')" />
				</div>
				<div class="contributor-field-element">
					<Dropdown v-model="dl" :options="licenseOptions" />
				</div>
				<div class="contributor-field-element">
					<Textarea v-model="notes" :placeholder="$t('message.helpers.contributor.notes')" :autoResize="false" rows="5" cols="30" />
				</div>

				<template #footer>
					<Button label="OK" icon="pi pi-check" autofocus
						@click="signCidRequest" />
				</template>
			</Dialog>
	</section>
</template>

<script src="@/src/js/helpers/contributor.js" scoped />
<style src="@/src/scss/helpers/contributor.scss" lang="scss" scoped />
