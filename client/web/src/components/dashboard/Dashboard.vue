<template>
	<section :class="dashboardClass">
		<Header 
			:selected-address="selectedAddress"
			:request-login="true"
			@currentProviderUpdate="(cp) => {currentProvider = cp}"
			@walletError="(error) => {walletError = error}" />
		<div class="body"
			v-if="currentProvider != null">
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
							No environmental assets found.
						</template>
						<template #loading>
							Loading data. Please wait.
						</template>
						<Column field="name" header="Name" :filterMatchModeOptions="assetsMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.name">{{ data.name }}</div>
									<input type="hidden" :ref="data.name" :value="data.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.name">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`Search by asset name - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" header="CID" :filterMatchModeOptions="assetsMatchModeOptions">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.cid">{{ data.cid }}</div>
									<input type="hidden" :ref="data.cid" :value="data.cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.cid">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`Search by asset CID - ${filterModel.matchMode}`"/>
							</template>
						</Column>
					</DataTable>
				</div>
			</div>
			<div class="body-group">
				<div class="body-item"
					@click="navigate('/schemas')">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-asset-templates") }}</div>
						<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-asset-templates-description") }}</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/bulb.png" />
					</div>
				</div>
				<div class="body-table">
					<DataTable :value="schemas" :paginator="true" :rows="10" responsiveLayout="scroll"
						dataKey="cid" v-model:filters="schemasFilters" filterDisplay="row" :loading="schemasLoading"
						@row-click="showSchema">
						<template #empty>
							No environmental schemas found.
						</template>
						<template #loading>
							Loading data. Please wait.
						</template>
						<Column field="name" header="Name" :filterMatchModeOptions="schemasMatchModeOptions"
							:sortable="true">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.name">{{ data.name }}</div>
									<input type="hidden" :ref="data.name" :value="data.name" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.name">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`Search by template name - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" header="CID" :filterMatchModeOptions="schemasMatchModeOptions">
							<template #body="{data}">
								<div class="in-line">
									<div class="cut link"
										v-tooltip.top="data.cid">{{ data.cid }}</div>
									<input type="hidden" :ref="data.cid" :value="data.cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.cid">
										</i>
									</div>
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`Search by template CID - ${filterModel.matchMode}`"/>
							</template>
						</Column>
					</DataTable>
				</div>
			</div>
			<Toast position="top-right" />
		</div>
	</section>
</template>

<script src="@/src/js/dashboard/dashboard.js" scoped />
<style src="@/src/scss/dashboard/dashboard.scss" lang="scss" scoped />
