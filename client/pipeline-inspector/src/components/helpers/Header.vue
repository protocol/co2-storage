<template>
	<section :class="headerClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<i :class="['pi', 'clickable', 'icon-green', {'pi-sun': themeVariety == 'dark', 'pi-moon': themeVariety == 'light'}]"
						@click.stop="switchThemeVariety">
					</i>
				</div>
				<div class="header-bar-rest">
					<div class="header-bar-rest-item highlighted"
						@click="account">
							<span v-if="!selectedAddress">{{ $t("message.main.header.connect-wallet") }}</span>
							<span v-else>{{ selectedAddress }}</span>
						</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/helpers/header.js" scoped />
<style src="@/src/scss/helpers/header.scss" lang="scss" scoped />
