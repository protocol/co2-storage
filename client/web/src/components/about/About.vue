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
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-1") }} <a class="body-item-link" href="https://github.com/protocol/FilecoinGreen-tools/blob/main/0006-FGTP-CO2_Storage.md"><u>0006-FGTP-CO2_Storage</u></a></span></div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-2") }} <a class="body-item-link" href="https://ipld.io/"><u>(IPLD DAGs)</u></a> {{ $t("message.about.body.about-description-3") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-4") }} <a class="body-item-link" href="https://docs.ipfs.io/concepts/content-addressing/"><u>content identifier</u></a> {{ $t("message.about.body.about-description-5") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-6") }} <a class="body-item-link" href="mailto: green@filecoin.org"><u>green@filecoin.org</u></a></span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-7") }} <a class="body-item-link" href="https://green.filecoin.io"><u>Filecoin Green</u></a> {{ $t("message.about.body.about-description-8") }}</span>		
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/about/about.js" scoped />
<style src="@/src/scss/about/about.scss" lang="scss" scoped />
