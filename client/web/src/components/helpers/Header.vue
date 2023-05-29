<template>
	<section :class="headerClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<div class="header-bar-home-circle"
						@click="navigate('/')">
					</div>
					<div class="header-bar-home-item"
						v-if="!addingDataChain && $route.name != 'main' && $route.name != 'about'">
						<Dropdown v-model="dataChain" :options="dataChains"
							:placeholder="$t('message.main.header.select-data-chain')" />
					</div>
					<div class="header-bar-home-item clickable"
						v-if="!addingDataChain && $route.name != 'main' && $route.name != 'about'"
						@click="addingDataChain = true">
						<i class="pi pi-plus-circle" style="font-size: 1.5rem"></i>
					</div>
					<div class="header-bar-home-item"
					v-if="addingDataChain && $route.name != 'main' && $route.name != 'about'">
						<div class="p-inputgroup">
							<Button icon="pi pi-times" class="p-button-secondary"
								@click="addingDataChain = false" />
							<InputText type="text" v-model="newDataChain" />
							<Button icon="pi pi-check" class="p-button-success"
								@click="setDataChain(newDataChain)" />
						</div>
					</div>
				</div>
				<div class="header-bar-rest">
					<div>
						<a class="header-bar-rest-item" href="https://filecoin-green.gitbook.io/filecoin-green-documentation/co2.storage-docs" target="_blank">{{ $t("message.main.header.docs") }}</a>
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/about')">{{ $t("message.main.header.about") }}
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/dashboard')">{{ $t("message.main.header.dashboard") }}
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/templates')">{{ $t("message.main.header.templates") }}
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/assets')">{{ $t("message.main.header.assets") }}</div>
					<div class="header-bar-rest-item highlighted"
						v-if="$route.name != 'main' && $route.name != 'about'"
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
