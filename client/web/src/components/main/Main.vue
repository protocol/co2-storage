<template>
	<section :class="mainClass">
		<Header ref="header"
			:request-login="false" />
		<div class="body">
			<div class="body-heading">{{ $t("message.main.body.title") }}</div>
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span><br>
				<span class="body-sub-heading-sentence colored left-margin-1">{{ $t("message.main.body.sub-title-colored") }}</span>
			</div>
			<!-- <div class="body-item-columns">
				<div class="body-item-column title">{{ $t("message.main.body.stats") }}</div>
				<div class="body-item-column link">{{ $t("message.main.body.view-all-stats") }}</div>
			</div>
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.main.body.cumulative-CO2") }}</div>
				<div class="body-item-description">{{ $t("message.main.body.cumulative-CO2-description") }}</div>
			</div>
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.main.body.cumulative-uploads") }}</div>
				<div class="body-item-description">{{ $t("message.main.body.cumulative-uploads-description") }}</div>
			</div>
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.main.body.average-uploads-per-month") }}</div>
				<div class="body-item-description">{{ $t("message.main.body.average-uploads-per-month-description") }}</div>
			</div>
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.main.body.cumulative-cids") }}</div>
				<div class="body-item-description">{{ $t("message.main.body.cumulative-cids-description") }}</div>
			</div>
			<div class="body-item">
				<div class="body-item-title">{{ $t("message.main.body.cumulative-environmental-asset-templates") }}</div>
				<div class="body-item-description">{{ $t("message.main.body.cumulative-environmental-asset-templates-description") }}</div>
			</div> -->
		</div>
	</section>
</template>


<script src="@/src/js/main/main.js" scoped />
<style src="@/src/scss/main/main.scss" lang="scss" scoped />
