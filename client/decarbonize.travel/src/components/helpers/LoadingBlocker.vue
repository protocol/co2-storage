<template>
	<section :class="loadingBlockerClass"
		v-show="loading">
		<ProgressSpinner />
		<div class="message">{{ message }}</div>
	</section>
</template>

<script src="@/src/js/helpers/loading-blocker.js" scoped />
<style src="@/src/scss/helpers/loading-blocker.scss" lang="scss" scoped />
