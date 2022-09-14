<template>
	<section :class="mainClass">
		<Header ref="header" />
		<div class="body">
			<div class="body-heading">{{ $t("message.main.body.title") }}</div>
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span>
				<span class="body-sub-heading-sentence colored left-margin-1">{{ $t("message.main.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item">
				<div class="body-item-title">CO2.storage</div>
				<div class="body-item-description">{{ $t("message.about.body.about-description") }}</div>
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-1") }} <a class="body-item-link" href="https://github.com/protocol/FilecoinGreen-tools/blob/main/0006-FGTP-CO2_Storage.md"><u>0006-FGTP-CO2_Storage</u></a></span>
				</div>
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-6") }} <a class="body-item-link" href="mailto: green@filecoin.org"><u>green@filecoin.org</u></a></span>	
				</div>
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-7") }} <a class="body-item-link" href="https://green.filecoin.io"><u>Filecoin Green</u></a> {{ $t("message.about.body.about-description-8") }}.</span>		
				</div>
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/main/main.js" scoped />
<style src="@/src/scss/main/main.scss" lang="scss" scoped />
