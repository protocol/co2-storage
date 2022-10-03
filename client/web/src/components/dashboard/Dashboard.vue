<template>
	<section :class="dashboardClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@selectedAddressUpdate="(addr) => {selectedAddress = addr}"
			@walletError="(error) => {walletError = error}" />
		<div class="body"
			v-if="selectedAddress != null">
			<div class="body-group">
				<div class="body-item"
					@click="navigate('/assets')">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-assets") }}</div>
						<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-assets-description") }}</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/ecology.png" />
					</div>
				</div>
				<div class="body-table">
					<DataTable :value="assets" :paginator="true" :rows="10" responsiveLayout="scroll"
						dataKey="cid" v-model:filters="assetsFilters" filterDisplay="row" :loading="assetsLoading"
						@row-click="showAsset">
						<template #empty>
							{{ $t("message.dashboard.body.no-assets-found") }}
						</template>
						<template #loading>
							{{ $t("message.dashboard.body.loading-data-wait") }}
						</template>
						<Column field="name" :header="$t('message.dashboard.body.name')" :filterMatchModeOptions="assetsMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.asset.name">{{ data.asset.name }}</div>
									<input type="hidden" :ref="data.asset.name" :value="data.asset.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.name">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.dashboard.body.search-by-asset-name')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" :header="$t('message.dashboard.body.cid')" :filterMatchModeOptions="assetsMatchModeOptions">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.asset.cid"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.asset.cid}`)">{{ data.asset.cid }}</div>
									<input type="hidden" :ref="data.asset.cid" :value="data.asset.cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.cid">
										</i>
									</div>
								</div>
								<div class="in-line">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.block}`)">{{ data.block }}</div>
									<input type="hidden" :ref="data.block" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.dashboard.body.search-by-asset-cid')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
					</DataTable>
				</div>
			</div>
			<div class="body-group">
				<div class="body-item"
					@click="navigate('/temlates')">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-asset-templates") }}</div>
						<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-asset-templates-description") }}</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/bulb.png" />
					</div>
				</div>
				<div class="body-table">
					<DataTable :value="templates" :paginator="true" :rows="10" responsiveLayout="scroll"
						dataKey="cid" v-model:filters="templatesFilters" filterDisplay="row" :loading="templatesLoading"
						@row-click="showTemplate">
						<template #empty>
							{{ $t("message.dashboard.body.no-asset-templates-found") }}
						</template>
						<template #loading>
							{{ $t("message.dashboard.body.loading-data-wait") }}
						</template>
						<Column field="name" :header="$t('message.dashboard.body.name')" :filterMatchModeOptions="templatesMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.template.name">{{ data.template.name }}</div>
									<input type="hidden" :ref="data.template.name" :value="data.template.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.name">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.dashboard.body.search-by-schema-name')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" :header="$t('message.dashboard.body.cid')" :filterMatchModeOptions="templatesMatchModeOptions">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.template.cid"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.template.cid}`)">{{ data.template.cid }}</div>
									<input type="hidden" :ref="data.template.cid" :value="data.template.cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.cid">
										</i>
									</div>
								</div>
								<div class="in-line">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.block}`)">{{ data.block }}</div>
									<input type="hidden" :ref="data.block" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.dashboard.body.search-by-schema-cid')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
					</DataTable>
				</div>
			</div>
			<LoadingBlocker :loading="loading" :message="loadingMessage" />
			<Toast position="top-right" />
		</div>
	</section>
</template>

<script src="@/src/js/dashboard/dashboard.js" scoped />
<style src="@/src/scss/dashboard/dashboard.scss" lang="scss" scoped />
