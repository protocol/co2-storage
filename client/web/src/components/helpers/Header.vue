<template>
	<section :class="headerClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<div class="header-bar-home-circle"
						@click="navigate('/')"></div>					
				</div>
				<div class="header-bar-rest">
					<div class="header-bar-rest-item">{{ $t("message.main.header.about") }}</div>
					<div class="header-bar-rest-item">{{ $t("message.main.header.stats") }}</div>
					<div class="header-bar-rest-item highlighted"
						@click="initMetamask">
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
