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
					<div class="header-bar-rest-item"
						@click="navigate('/dashboard')">{{ $t("message.main.header.dashboard") }}</div>
					<div class="header-bar-rest-item"
						@click="navigate('/schemas')">{{ $t("message.main.header.templates") }}</div>
					<div class="header-bar-rest-item"
						@click="navigate('/assets')">{{ $t("message.main.header.assets") }}</div>
					<div class="header-bar-rest-item highlighted"
						v-if="$route.name != 'main'"
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
