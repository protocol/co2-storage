<template>
	<section :class="mainClass">
		<Header ref="header" />
		<div class="body">
			<div class="body-heading">{{ $t("message.main.body.title") }}</div>
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span>
				<span class="body-sub-heading-sentence colored">{{ $t("message.main.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item">
				
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description") }} {{ $t("message.about.body.about-description-1") }} <a class="body-item-link" href="https://github.com/protocol/FilecoinGreen-tools/blob/main/0006-FGTP-CO2_Storage.md" target="_blank"><u>0006-FGTP-CO2_Storage</u></a>.</span>
				</div>
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-6") }} <a class="body-item-link" href="https://forms.gle/CS5tY4kpsajpiTGV7" target="_blank"><u>CO2.Storage Updates Form</u></a>.</span>	
				</div> 
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-7") }}. {{ $t("message.about.body.about-description-8") }} <a class="body-item-link" href="https://github.com/protocol/co2_storage_schemas" target="_blank"><u>CO2.Storage Schemas Repo</u></a>.</span>		
				</div>
				<div class="body-item-description">
					<span class="body-item-about-description">{{ $t("message.about.body.about-description-9") }} <a class="body-item-link" href="https://green.filecoin.io" target="_blank"><u>Filecoin Green</u></a> {{ $t("message.about.body.about-description-10") }}.</span>		
				</div>
			</div>
		</div>
	</section>
</template>


<script src="@/src/js/main/main.js" scoped />
<style src="@/src/scss/main/main.scss" lang="scss" scoped />
