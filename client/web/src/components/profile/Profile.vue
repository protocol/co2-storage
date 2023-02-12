<template>
	<section :class="profileClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(addr) => {selectedAddress = addr}"
			@refresh="() => {refresh = true}"
			@walletError="(error) => {walletError = error}" />
		<div class="body"
			v-if="selectedAddress != null">
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.my-api-token") }}</div>
						<div class="body-item-description">
							<div>{{ (apiToken) ? apiToken : $t("message.profile.no-api-token-created") }}</div>
							<div v-if="apiTokenValidity">{{ `${$t("message.profile.valid-until")} ${moment(apiTokenValidity).format(dateFormat)}` }}</div>
							<div class="button highlighted"
								@click="getApiToken(true)">
								{{ $t("message.profile.create-new") }}
							</div>
						</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/account.png" />
					</div>
				</div>
			</div>
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.my-estuary-key") }}</div>
						<div class="body-item-description">
							<div>{{ (apiToken) ? estuaryKey : $t("message.profile.no-estuary-key-created") }}</div>
							<div v-if="estuaryKeyValidity">{{ `${$t("message.profile.valid-until")} ${moment(estuaryKeyValidity).format(dateFormat)}` }}</div>
							<div class="button highlighted"
								@click="createEstuaryKey">
								{{ $t("message.profile.create-new") }}
							</div>
							<div class="button highlighted"
								@click="revokeEstuaryKey">
								{{ $t("message.profile.revoke") }}
							</div>
						</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/private-key.png" />
					</div>
				</div>
			</div>
			<LoadingBlocker :loading="loading" :message="loadingMessage" />
			<Toast position="top-right" />
		</div>
	</section>
</template>

<script src="@/src/js/profile/profile.js" scoped />
<style src="@/src/scss/profile/profile.scss" lang="scss" scoped />
