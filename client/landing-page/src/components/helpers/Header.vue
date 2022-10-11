<template>
	<section :class="headerClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<div class="header-bar-home-circle"
						@click="navigate('/')">
					</div>				
				</div>
				<div class="header-bar-rest" />
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/helpers/header.js" scoped />
<style src="@/src/scss/helpers/header.scss" lang="scss" scoped />
