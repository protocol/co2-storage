<template>
	<section :class="profileClass">
		<Header
			@authenticate="async () => { await doAuth(); await init() }" />
			<div class="body"
			v-if="selectedAddress != null">
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.my-api-token") }}</div>
						<div class="body-item-description">
							<div class="in-line">
								<div>{{ (apiToken) ? apiToken : $t("message.profile.no-api-token-created") }}</div>
								<input type="hidden" :value="apiToken" />
								<div class="copy"
									v-if="apiToken">
									<i class="pi pi-copy"
										@click.stop="copyToClipboard"
										:data-ref="apiToken">
									</i>
								</div>
							</div>
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
							<div class="in-line">
								<div>{{ (estuaryKey) ? estuaryKey : $t("message.profile.no-estuary-key-created") }}</div>
								<input type="hidden" :value="estuaryKey" />
								<div class="copy"
									v-if="estuaryKey">
									<i class="pi pi-copy"
										@click.stop="copyToClipboard"
										:data-ref="estuaryKey">
									</i>
								</div>
							</div>
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
		</div>
		<div class="body"
			v-if="selectedAddress != null">
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.contributor-name") }}</div>
						<div class="body-item-description">
							<div class="field">
								<InputText v-model="cn" :placeholder="$t('message.helpers.contributor.name')" />
							</div>
							<div class="button highlighted"
								@click="saveContributorName">
								{{ $t("message.profile.save") }}
							</div>
						</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/programmer.png" />
					</div>
				</div>
			</div>
			<div class="body-group">
				<div class="body-item">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.profile.default-license") }}</div>
						<div class="body-item-description">
							<div class="field">
								<Dropdown v-model="dl" :options="licenseOptions" />
							</div>
							<div class="button highlighted"
								@click="saveDefaultLicense">
								{{ $t("message.profile.save") }}
							</div>
						</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/contract.png" />
					</div>
				</div>
			</div>
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/profile/profile.js" scoped />
<style src="@/src/scss/profile/profile.scss" lang="scss" scoped />
