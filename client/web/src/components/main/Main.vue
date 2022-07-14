<template>
	<section :class="mainClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<div class="header-bar-home-circle"></div>					
				</div>
				<div class="header-bar-rest">
					<div class="header-bar-rest-item">{{ $t("message.main.header.about") }}</div>
					<div class="header-bar-rest-item">{{ $t("message.main.header.stats") }}</div>
					<div class="header-bar-rest-item highlighted">{{ $t("message.main.header.connect-wallet") }}</div>
				</div>
			</div>
		</div>
		<div class="body">
			<div class="body-heading">{{ $t("message.main.body.title") }}</div>
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span>
				<span class="body-sub-heading-sentence colored left-margin-1">{{ $t("message.main.body.sub-title-colored") }}</span>
			</div>
			<div class="body-item-columns">
				<div class="body-item-column title">{{ $t("message.main.body.stats") }}</div>
				<div class="body-item-column link">{{ $t("message.main.body.view-all-stats") }}</div>
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
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/main/main.js" scoped />
<style src="@/src/scss/main/main.scss" lang="scss" scoped />
