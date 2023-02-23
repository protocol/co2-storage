<template>
	<section :class="aboutClass">
		<Header ref="header"
			:selected-address="selectedAddress"
			:request-login="false"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="body">
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span>
				<span class="body-sub-heading-sentence colored">{{ $t("message.about.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item-columns">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description") }} {{ $t("message.about.body.about-description-1") }} <a class="body-item-link" href="https://github.com/protocol/FilecoinGreen-tools/blob/main/0006-FGTP-CO2_Storage.md" target="_blank"><u>0006-FGTP-CO2_Storage</u></a>.</span>
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-6") }} <b><i style="color:#2f855a">{{ $t("message.about.body.about-description-7") }}</i></b>, {{ $t("message.about.body.about-description-8") }}.</span>	
			</div>
			
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-2") }} <a class="body-item-link" href="https://ipld.io/" target="_blank"><u>(IPLD DAGs)</u></a> {{ $t("message.about.body.about-description-3") }}</span>	
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-4") }} <a class="body-item-link" href="https://docs.ipfs.io/concepts/content-addressing/" target="_blank"><u>content identifier</u></a> {{ $t("message.about.body.about-description-5") }}</span>	
			</div>

			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-10") }}. {{ $t("message.about.body.about-description-11") }} <a class="body-item-link" href="https://github.com/protocol/co2_storage_schemas" target="_blank"><u>CO2.Storage Schemas Repo</u></a>.</span>		
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-12") }} <a class="body-item-link" href="https://forms.gle/CS5tY4kpsajpiTGV7" target="_blank"><u>CO2.Storage Updates Form</u></a>.</span>		
			</div>
			
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-13") }}.</span>		
			</div>
			<div class="body-item-columns">
				<span class="body-item-about-description">{{ $t("message.about.body.about-description-14") }} <span style="font-size:100%;color:green;">&hearts;</span> {{ $t("message.about.body.about-description-15") }} <a class="body-item-link" href="https://green.filecoin.io" target="_blank"><u>Filecoin Green</u></a> {{ $t("message.about.body.about-description-16") }}.</span>		
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/about/about.js" scoped />
<style src="@/src/scss/about/about.scss" lang="scss" scoped />
