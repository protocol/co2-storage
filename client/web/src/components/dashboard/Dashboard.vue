<template>
	<section :class="dashboardClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="body"
			v-if="currentProvider != null">
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-assets") }}</div>
				<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-assets-description") }}</div>
			</div>
			<div class="body-item"
				@click="navigate('/schemas')">
				<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-asset-templates") }}</div>
				<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-asset-templates-description") }}</div>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/dashboard/dashboard.js" scoped />
<style src="@/src/scss/dashboard/dashboard.scss" lang="scss" scoped />
