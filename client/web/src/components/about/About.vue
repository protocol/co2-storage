<template>
	<section :class="aboutClass">
		<Header ref="header"
			:selected-address="selectedAddress"
			:request-login="false"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="body">
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.about.body.title") }}</span>
				<span class="body-sub-heading-sentence colored left-margin-1">{{ $t("message.about.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-1") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-2") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-3") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-4") }}</span>	
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/about/about.js" scoped />
<style src="@/src/scss/about/about.scss" lang="scss" scoped />
