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
					<DataTable :value="assets" :lazy="true" :totalRecords="assetsSearchResults" :paginator="true" :rows="assetsSearchLimit"
						@page="assetsPage($event)" responsiveLayout="scroll" :loading="assetsLoading" @row-click="showAsset"
						v-model:filters="assetsFilters" @filter="assetsFilter($event)" filterDisplay="row" @sort="assetsSort($event)">
						<template #header>
							<span class="p-input-icon-left ">
								<i class="pi pi-search" />
								<InputText v-model="assetsFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
							</span>
						</template>
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
										v-tooltip.top="data.asset.content_cid"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.asset.content_cid}`)">{{ data.asset.content_cid }}</div>
									<input type="hidden" :ref="data.asset.content_cid" :value="data.asset.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.content_cid">
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
					<DataTable :value="templates" :lazy="true" :totalRecords="templatesSearchResults" :paginator="true" :rows="templatesSearchLimit"
						@page="templatesPage($event)" responsiveLayout="scroll" :loading="templatesLoading" @row-click="showTemplate"
						v-model:filters="templatesFilters" @filter="templatesFilter($event)" filterDisplay="row" @sort="templatesSort($event)">
						<template #header>
							<span class="p-input-icon-left ">
								<i class="pi pi-search" />
								<InputText v-model="templatesFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
							</span>
						</template>
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
										v-tooltip.top="data.template.content_cid"
										@click.stop="externalUrl(`${ipldExplorerUrl}${data.template.content_cid}`)">{{ data.template.content_cid }}</div>
									<input type="hidden" :ref="data.template.content_cid" :value="data.template.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.content_cid">
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
