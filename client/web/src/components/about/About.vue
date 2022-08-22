<template>
	<section :class="aboutClass">
		<Header ref="header"
			:selected-address="selectedAddress"
			:request-login="false"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="body">
			<div class="body-heading">{{ $t("message.about.body.title") }}</div>
			<div class="body-sub-title">
				<span class="body-sub-title">{{ $t("message.about.body.sub-title") }}</span>
				<span class="body-sub-title-colored">{{ $t("message.about.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item-description">
				<span class="body-about-description">{{ $t("message.about.body.about-description") }}</span>	
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/about/about.js" scoped />
<style src="@/src/scss/about/about.scss" lang="scss" scoped />
