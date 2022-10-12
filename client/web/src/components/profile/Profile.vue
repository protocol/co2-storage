<template>
	<section :class="profileClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(addr) => {selectedAddress = addr}"
			@walletError="(error) => {walletError = error}" />
		<div class="body"
			v-if="selectedAddress != null">
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.my-ui-theme") }}</div>
						<div class="body-item-description">{{ $t("message.profile.my-ui-theme-description", {themeName: themeName}) }}</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/theme.png" />
					</div>
				</div>
			</div>
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.my-estuary-key") }}</div>
						<div class="body-item-description"></div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/private-key.png" />
					</div>
				</div>
			</div>
			<LoadingBlocker :loading="loading" :message="loadingMessage" />
			<Toast position="top-right" />
		</div>
	</section>
</template>

<script src="@/src/js/profile/profile.js" scoped />
<style src="@/src/scss/profile/profile.scss" lang="scss" scoped />
