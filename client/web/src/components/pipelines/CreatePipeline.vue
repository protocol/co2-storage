<template>
	<section :class="createPipelineClass">
		<Header
			@authenticate="async () => { await doAuth() }" />

		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/pipelines/create-pipeline.js" scoped />
<style src="@/src/scss/pipelines/create-pipeline.scss" lang="scss" scoped />
