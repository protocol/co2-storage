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
				</div>
			</div>
		</div>
		<div class="body">
			<div class="body-heading">{{ $t("message.main.body.title") }}</div>
			<div class="body-sub-heading">
				<span class="body-sub-heading-sentence">{{ $t("message.main.body.sub-title") }}</span>
				<span class="body-sub-heading-sentence colored left-margin-1">{{ $t("message.main.body.sub-title-colored") }}</span>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/main/main.js" scoped />
<style src="@/src/scss/main/main.scss" lang="scss" scoped />
