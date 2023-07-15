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
					<div class="header-bar-rest-item hand-held"
						@click="handHeldMenu = !handHeldMenu"><i class="pi pi-bars" style="font-size: 1.5rem"></i>
					</div>
					<div class="header-bar-rest-item"
						@click="externalUrl('https://filecoin-green.gitbook.io/filecoin-green-documentation/co2.storage-docs', '_blank')">
						{{ $t("message.main.header.docs") }}
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
						@click="navigate('/assets')">{{ $t("message.main.header.assets") }}
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/functions')">{{ $t("message.main.header.functions") }}
					</div>
					<div class="header-bar-rest-item"
						@click="navigate('/pipelines')">{{ $t("message.main.header.pipelines") }}
					</div>
					<div class="header-bar-rest-item highlighted"
						v-if="$route.name != 'main' && $route.name != 'about'"
						@click="account">
							<span v-if="!selectedAddress">{{ $t("message.main.header.connect-wallet") }}</span>
							<span v-else>{{ selectedAddress }}</span>
						</div>
				</div>
			</div>
		</div>
		<div class="hand-held-menu"
			v-if="handHeldMenu">
			<div class="hand-held-menu-item"
				@click="externalUrl('https://filecoin-green.gitbook.io/filecoin-green-documentation/co2.storage-docs', '_blank')">
				{{ $t("message.main.header.docs") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/about')">{{ $t("message.main.header.about") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/dashboard')">{{ $t("message.main.header.dashboard") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/templates')">{{ $t("message.main.header.templates") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/assets')">{{ $t("message.main.header.assets") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/functions')">{{ $t("message.main.header.functions") }}
			</div>
			<div class="hand-held-menu-item"
				@click="navigate('/pipelines')">{{ $t("message.main.header.pipelines") }}
			</div>
			<div class="hand-held-menu-item highlighted"
				v-if="$route.name != 'main' && $route.name != 'about'"
				@click="account">
					<span v-if="!selectedAddress">{{ $t("message.main.header.connect-wallet") }}</span>
					<span v-else>{{ selectedAddress }}</span>
				</div>
		</div>
	</section>
</template>

<script src="@/src/js/helpers/header.js" scoped />
<style src="@/src/scss/helpers/header.scss" lang="scss" scoped />
