<template>
	<section :class="dashboardClass">
		<Header
			@authenticate="async () => { await doAuth(); await init() }" />
		<div class="body">
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
				<div class="body-table"
					v-if="selectedAddress != null">
					<DataTable :value="assets" :lazy="true" :totalRecords="assetsSearchResults" :paginator="true" :rows="assetsSearchLimit"
						@page="assetsPage($event)" responsiveLayout="scroll" :loading="assetsLoading" @row-click="showAsset"
						v-model:filters="assetsFilters" @filter="assetsFilter($event)" filterDisplay="row" @sort="assetsSort($event)"
						paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
						:rowsPerPageOptions="[3,5,10,20,50]">
						<template #header>
							<span class="p-input-icon-left ">
								<i class="pi pi-search" />
								<InputText v-model="assetsFullTextSearch" :placeholder="$t('message.dashboard.body.keyword-search')" />
							</span>
							<span class="total-size">
								{{ $t('message.shared.total-size') }} {{ humanReadableFileSize(totalAssetSize) }}
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
								<div class="in-line record-size"
									v-if="data.asset.size">
									{{ humanReadableFileSize(data.asset.size) }}
								</div>
							</template>
							<template #filter="{filterModel,filterCallback}">
								<InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" :placeholder="`${$t('message.dashboard.body.search-by-asset-name')} - ${filterModel.matchMode}`"/>
							</template>
						</Column>
						<Column field="cid" :header="$t('message.dashboard.body.cid')" :filterMatchModeOptions="assetsMatchModeOptions">
							<template #body="{data}">
								<div class="in-line" :provenanceExists="hasProvenance(data.asset.content_cid)">
									<div class="cut link"
										v-tooltip.top="data.asset.content_cid"
										@click.stop="showIpldDialog(data.asset.content_cid)">{{ data.asset.content_cid }}</div>
									<input type="hidden" :ref="data.asset.content_cid" :value="data.asset.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.asset.content_cid">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.asset.content_cid]"
											@click.stop="sign(data.asset.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.asset.content_cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.asset.content_cid]"
											@click.stop="loadSignatures(data.asset.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
								<div class="in-line" :provenanceExists="hasProvenance(data.asset.cid)">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="showIpldDialog(data.asset.cid)">{{ data.block }}</div>
									<input type="hidden" :ref="data.block" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.asset.cid]"
											@click.stop="sign(data.asset.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.asset.cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.asset.cid]"
											@click.stop="loadSignatures(data.asset.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
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
					@click="navigate('/templates')">
					<div class="body-item-content">
						<div class="body-item-title">{{ $t("message.dashboard.body.my-environmental-asset-templates") }}</div>
						<div class="body-item-description">{{ $t("message.dashboard.body.my-environmental-asset-templates-description") }}</div>
					</div>
					<div class="body-item-icon">
						<img src="@/assets/bulb.png" />
					</div>
				</div>
				<div class="body-table"
					v-if="selectedAddress != null">
					<DataTable :value="templates" :lazy="true" :totalRecords="templatesSearchResults" :paginator="true" :rows="templatesSearchLimit"
						@page="templatesPage($event)" responsiveLayout="scroll" :loading="templatesLoading" @row-click="showTemplate"
						v-model:filters="templatesFilters" @filter="templatesFilter($event)" filterDisplay="row" @sort="templatesSort($event)"
						paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
						:rowsPerPageOptions="[3,5,10,20,50]">
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
								<div class="in-line" :provenanceExists="hasProvenance(data.template.content_cid)">
									<div class="cut link"
										v-tooltip.top="data.template.content_cid"
										@click.stop="showIpldDialog(data.template.content_cid)">{{ data.template.content_cid }}</div>
									<input type="hidden" :ref="data.template.content_cid" :value="data.template.content_cid" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.template.content_cid">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!provenanceExist[data.template.content_cid]"
											@click.stop="sign(data.template.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.template.content_cid})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="provenanceExist[data.template.content_cid]"
											@click.stop="loadSignatures(data.template.content_cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
										</i>
									</div>
								</div>
								<div class="in-line" :provenanceExists="hasProvenance(data.template.cid)">
									<i class="pi pi-box icon-floating-left" />
									<div class="cut link"
										v-tooltip.top="data.block"
										@click.stop="showIpldDialog(data.template.cid)">{{ data.block }}</div>
									<input type="hidden" :ref="data.block" :value="data.block" />
									<div class="copy">
										<i class="pi pi-copy"
											@click.stop="copyToClipboard"
											:data-ref="data.block">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-user-edit"
											v-if="!data.template.signature && !provenanceExist[data.template.cid]"
											@click.stop="sign(data.template.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.sign-something', {something: data.template.name})">
										</i>
									</div>
									<div class="copy">
										<i class="pi pi-verified"
											v-if="data.template.signature || provenanceExist[data.template.cid]"
											@click.stop="loadSignatures(data.template.cid)"
											v-tooltip.bottom="$t('message.dashboard.body.view-signatures')">
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
			<Dialog v-model:visible="displaySignDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
				<template #header>
					<h3>{{ $t('message.dashboard.body.signed-cid') }}</h3>
				</template>

				<div v-if="!signDialog.error">
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.method') }}</div><div class="dialog-cell">{{signDialog.result.method}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verifying-contract') }}</div><div class="dialog-cell">{{signDialog.result.verifying_contract}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.chain-id') }}</div><div class="dialog-cell">{{signDialog.result.chain_id}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signer') }}</div><div class="dialog-cell">{{signDialog.result.contributor_key}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.cid') }}</div><div class="dialog-cell">{{signDialog.result.payload}}</div></div>
					<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature') }}</div><div class="dialog-cell">{{signDialog.result.signature}}</div></div>
				</div>
				<div v-else>
					{{signDialog.error}}
				</div>

				<template #footer>
					<Button label="OK" icon="pi pi-check" autofocus
						@click="displaySignDialog = false" />
				</template>
			</Dialog>
			<Dialog v-model:visible="displaySignedDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
				<template #header>
					<h3>{{ $t('message.dashboard.body.signatures') }}</h3>
				</template>

				<div v-for="(signedDialog, signedDialogIndex) in signedDialogs">
					<hr />
					<div v-if="!signedDialog.error">
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.method') }}</div><div class="dialog-cell">{{signedDialog.signature_method}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verifying-contract') }}</div><div class="dialog-cell">{{signedDialog.signature_verifying_contract}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.chain-id') }}</div><div class="dialog-cell">{{signedDialog.signature_chain_id}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signer') }}</div><div class="dialog-cell">{{signedDialog.signature_account}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.cid') }}</div><div class="dialog-cell">{{signedDialog.signature_cid}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature') }}</div><div class="dialog-cell"></div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-v') }}</div><div class="dialog-cell">{{signedDialog.signature_v}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-r') }}</div><div class="dialog-cell">{{signedDialog.signature_r}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.signature-s') }}</div><div class="dialog-cell">{{signedDialog.signature_s}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
						<div class="dialog-row"><div class="dialog-cell">{{ $t('message.shared.verified') }}</div><div class="dialog-cell">{{signedDialog.verified}}</div></div>
						<div class="dialog-row"><div class="dialog-cell">&nbsp;</div><div class="dialog-cell"></div></div>
						<div class="dialog-row code" rowspan="2" v-if="signedDialog.provenanceMessageSignature"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{signedDialog.cid}}</span></div>
						<div rowspan="2" v-if="signedDialog.provenanceMessageSignature"><vue-json-pretty :data="signedDialog.provenanceMessageSignature" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
						<div class="dialog-row code" rowspan="2" v-if="signedDialog.provenanceMessage"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{signedDialog.provenanceMessageSignature.provenance_message}}</span></div>
						<div rowspan="2" v-if="signedDialog.provenanceMessage"><vue-json-pretty :data="signedDialog.provenanceMessage" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
					</div>
					<div v-else>
						{{signedDialog.error}}
					</div>
					<p><hr /></p>
				</div>

				<template #footer>
					<Button label="Close" class="p-button-warning" icon="pi pi-times" autofocus
						@click="displaySignedDialog = false" />
					<Button v-if="selectedAddress != null && !hasMySignature[signedDialogs.map((sd)=>{return sd.reference})[0]]" label="Sign" icon="pi pi-user-edit" autofocus
						@click="sign(signedDialogs.map((sd)=>{return sd.reference})[0], signedDialogs); displaySignedDialog = false" />
				</template>
			</Dialog>
			<Dialog v-model:visible="displayIpldDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
				<template #header>
					<h3>{{ $t('message.dashboard.body.ipld') }}</h3>
				</template>

				<div class="dialog-row code" v-if="ipldDialog.payload"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{ipldDialog.cid}}</span></div>
				<div v-if="ipldDialog.payload"><vue-json-pretty :data="ipldDialog.payload" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>

				<template #footer>
					<Button label="OK" icon="pi pi-check" autofocus
						@click="displayIpldDialog = false" />
				</template>
			</Dialog>
			<Contributor
				@set-contributor-dialog-visible="(visible) => {displayContributorDialog = visible}"
				@set-contributor-name="(name) => {$store.dispatch('main/setFgApiProfileName', name)}"
				@set-data-license="(license) => {$store.dispatch('main/setFgApiProfileDefaultDataLicense', license)}"
				@sign-cid-request="(request) => signRequest(request)"
				:display-contributor-dialog="displayContributorDialog"
				:contributor-name="fgApiProfileName"
				:data-license="fgApiProfileDefaultDataLicense"
				:contribution-cid="contributionCid" />
		</div>
		<LoadingBlocker :loading="loading" :message="loadingMessage" />
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/dashboard/dashboard.js" scoped />
<style src="@/src/scss/dashboard/dashboard.scss" lang="scss" scoped />
