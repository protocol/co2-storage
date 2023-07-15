<template>
	<section :class="pipelinesClass">
		<Header
			@authenticate="async () => { await doAuth() }" />

		<div class="data-view-holder">
			<DataView :value="pipelines" :layout="pipelinesLayout" :lazy="true"
				:paginator="true" :rows="pipelinesSearchLimit" :totalRecords="pipelinesSearchResults" @page="pipelinesPage($event)"
				paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
				:rowsPerPageOptions="[1, 3,5,10,20,50]">
				<template #header>
					<div class="flex justify-content-end">
						<DataViewLayoutOptions v-model="pipelinesLayout" />
					</div>
				</template>

				<template #list="slotProps">
					<div class="col-12">
						<div class="flex flex-column xl:flex-row xl:align-items-start p-4 gap-4">
							<img class="w-9 sm:w-16rem xl:w-10rem shadow-2 block xl:block mx-auto border-round clickable" src="@/assets/Bacalhau-WA.png" :alt="slotProps.data.name"
								@click="showPipeline(slotProps.data)" />
							<div class="flex flex-column sm:flex-row justify-content-between align-items-center xl:align-items-start flex-1 gap-4">
								<div class="flex flex-column align-items-center sm:align-items-start gap-2">
									<div class="flex align-items-center gap-2">
										<div class="text-2xl font-bold text-900 clickable"
											@click="showPipeline(slotProps.data)">{{ slotProps.data.name }}</div>
										<Tag class="clickable" :value="$t('message.dashboard.body.ipld')" severity="info"
											@click="showIpldDialog(slotProps.data.cid)"></Tag>
									</div>
									<div class="text-xs text-300">{{ moment(slotProps.data.timestamp).format('YYYY-MM-DD HH:mm') }}</div>
									<div class="text-sm text-300">{{ slotProps.data.description }}</div>
									<Rating :modelValue="(slotProps.data.rating) ? slotProps.data.rating : 0" :cancel="false"></Rating>
<!--									<div class="flex align-items-center gap-3">
										<span class="flex align-items-center gap-2">
											<i class="pi pi-tag"></i>
											<span class="font-semibold">{{ slotProps.data.function_type }}</span>
										</span>
										<Tag :value="(slotProps.data.retired) ? this.$t('message.functions.retired') : this.$t('message.functions.active')" :severity="(slotProps.data.retired) ? 'warning' : 'success'"></Tag>
									</div>	-->
									<div class="flex align-items-center gap-2">
										<Button size="small" type="button" :label="$t('message.functions.inputs')" icon="pi pi-sign-in" :badge="totalInterfaces(slotProps.data, 'inputs')" badgeClass="p-badge-primary" outlined
											@click="showInterfaces(slotProps.data, 'inputs')" />
										<Button size="small" type="button" :label="$t('message.functions.functions')" icon="pi pi-stop" :badge="totalInterfaces(slotProps.data, 'functions')" badgeClass="p-badge-primary" outlined
											@click="showInterfaces(slotProps.data, 'functions')" />
										<Button size="small" type="button" :label="$t('message.functions.outputs')" icon="pi pi-sign-out" :badge="totalInterfaces(slotProps.data, 'outputs')" badgeClass="p-badge-primary" outlined
											@click="showInterfaces(slotProps.data, 'outputs')" />
									</div>
								</div>
								<div class="flex sm:flex-column align-items-center sm:align-items-end gap-3 sm:gap-2">
									<span class="text-2xl font-semibold">${{ 'FREE' }}</span>
									<Button icon="pi pi-play" rounded disabled></Button>
								</div>
							</div>
						</div>
					</div>
				</template>

				<template #grid="slotProps">
					<div class="col-12 sm:col-6 lg:col-12 xl:col-4 p-2">
						<div class="p-4 border-1 surface-border surface-card border-round">
<!--							<div class="flex flex-wrap align-items-center justify-content-between gap-2">
								<div class="flex align-items-center gap-2">
									<i class="pi pi-tag"></i>
									<span class="font-semibold">{{ slotProps.data.function_type }}</span>
								</div>
								<Tag :value="(slotProps.data.retired) ? this.$t('message.functions.retired') : this.$t('message.functions.active')" :severity="(slotProps.data.retired) ? 'warning' : 'success'"></Tag>
							</div>	-->
							<div class="flex flex-column align-items-center gap-2 py-5">
								<img class="w-9 shadow-2 border-round clickable" src="@/assets/Bacalhau-WA.png" :alt="slotProps.data.name"
									@click="showPipeline(slotProps.data)" />
								<div class="flex align-items-center gap-2">
									<div class="text-2xl font-bold clickable"
										@click="showPipeline(slotProps.data)">{{ slotProps.data.name }}</div>
									<Tag class="clickable" :value="$t('message.dashboard.body.ipld')" severity="info"
										@click="showIpldDialog(slotProps.data.cid)"></Tag>
								</div>
								<div class="text-xs text-300">{{ moment(slotProps.data.timestamp).format('YYYY-MM-DD HH:mm') }}</div>
								<div class="text-sm text-300">{{ slotProps.data.description }}</div>
								<Rating :modelValue="(slotProps.data.rating) ? slotProps.data.rating : 0" :cancel="false"></Rating>
								<div class="flex align-items-center gap-2">
									<Button size="small" type="button" :label="$t('message.functions.inputs')" icon="pi pi-sign-in" :badge="totalInterfaces(slotProps.data, 'inputs')" badgeClass="p-badge-primary" outlined
										@click="showInterfaces(slotProps.data, 'inputs')" />
									<Button size="small" type="button" :label="$t('message.functions.functions')" icon="pi pi-stop" :badge="totalInterfaces(slotProps.data, 'functions')" badgeClass="p-badge-primary" outlined
										@click="showInterfaces(slotProps.data, 'functions')" />
									<Button size="small" type="button" :label="$t('message.functions.outputs')" icon="pi pi-sign-out" :badge="totalInterfaces(slotProps.data, 'outputs')" badgeClass="p-badge-primary" outlined
										@click="showInterfaces(slotProps.data, 'outputs')" />
								</div>
							</div>
							<div class="flex align-items-center justify-content-between">
								<span class="text-2xl font-semibold">${{ 'FREE' }}</span>
								<Button icon="pi pi-play" rounded disabled></Button>
							</div>
						</div>
					</div>
				</template>
			</DataView>
		</div>

		<div class="main-container"
			v-if="formVisible">
			<div class="grid-container">
				<div class="form-container">
					<div class="scene">
						<div class="panel clickable provenance"
							@click="gridLayer = 'provenance'"></div>
						<div class="panel clickable function"
							@click="gridLayer = 'function'"></div>
						<div class="panel clickable data"
							@click="gridLayer = 'data'"></div>
						<div :class="['panel-title', 'clickable', {'active': gridLayer == 'provenance'}]"
							@click="gridLayer = 'provenance'">{{ $t('message.pipelines.provenance') }}</div>
						<div :class="['panel-title', 'clickable', {'active': gridLayer == 'function'}]"
							@click="gridLayer = 'function'">{{ $t('message.pipelines.function') }}</div>
						<div :class="['panel-title', 'clickable', {'active': gridLayer == 'data'}]"
							@click="gridLayer = 'data'">{{ $t('message.pipelines.data') }}</div>
					</div>
					<div class="grid-column" v-for="(column, columnIndex) in pipelineGrid" :key="columnIndex">
						<div class="grid-cell" v-for="(cell, cellIndex) in column" :key="cellIndex"
							@click="setActiveCell(columnIndex, cellIndex)">
							<div :class="['grid-cell-holder', 'clickable', {
								'active': (activeColumnIndex == columnIndex && activeCellIndex == cellIndex)
								}]">
								<div :class="['grid-cell-contents', {
									'grid-layer-data': gridLayer == 'data',
									'grid-layer-function': gridLayer == 'function',
									'grid-layer-provenance': gridLayer == 'provenance'
									}]"
									v-if="cell.fn"></div>
							</div>
						</div>
					</div>
				</div>
				<div v-if="dataVisible" class="cell-data">
					<div v-for="(iface, ifaceIndex) in displayInterface.iface" :key="ifaceIndex">
						<div class="gap-3">
							<div class="flex align-items-center gap-2">
								<div :class="['text-2xl', 'font-bold', {'clickable': iface.endpoint}]"
									@click="(iface.endpoint) ? $router.push(`${iface.endpoint}/${iface.cid}`) : ''"
									v-if="iface.name">{{ iface.name }}</div>
								<Tag class="clickable" :value="$t('message.shared.show')" severity="info"
									v-if="iface.endpoint"
									@click="$router.push(`${iface.endpoint}/${iface.cid}`)"></Tag>
							</div>
							<div v-if="iface.description">{{ iface.description }}</div>
							<div v-if="iface.timestamp">{{ moment(iface.timestamp).format('YYYY-MM-DD HH:MM') }}</div>
							<p />
							<div class="dialog-row code" v-if="iface.payload"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{iface.cid}}</span></div>
							<div v-if="iface.payload"><vue-json-pretty :data="iface.payload" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
						</div>
					</div>
				</div>

			</div>
		</div>

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

		<Dialog v-model:visible="displayInterfacesDialog" :breakpoints="{'960px': '75vw', '640px': '100vw'}" :style="{width: '75vw'}">
			<template #header>
				<h3>{{ $t(`message.functions.${displayInterface.type}`) }}</h3>
			</template>

			<div v-for="(iface, ifaceIndex) in displayInterface.iface" :key="ifaceIndex">
				<div class="gap-3">
					<div class="flex align-items-center gap-2">
						<div :class="['text-2xl', 'font-bold', {'clickable': iface.endpoint}]"
							@click="(iface.endpoint) ? $router.push(`${iface.endpoint}/${iface.cid}`) : ''"
							v-if="iface.name">{{ iface.name }}</div>
						<Tag class="clickable" :value="$t('message.shared.show')" severity="info"
							v-if="iface.endpoint"
							@click="$router.push(`${iface.endpoint}/${iface.cid}`)"></Tag>
					</div>
					<div v-if="iface.description">{{ iface.description }}</div>
					<div v-if="iface.timestamp">{{ moment(iface.timestamp).format('YYYY-MM-DD HH:MM') }}</div>
					<p />
					<div class="dialog-row code" v-if="iface.payload"><span class="dialog-cell">$ ipfs dag get</span>&nbsp;<span class="dialog-cell code-highlight">{{iface.cid}}</span></div>
					<div v-if="iface.payload"><vue-json-pretty :data="iface.payload" :showLine="false" :highlightSelectedNode="false" :selectOnClickNode="false" /></div>
				</div>
			</div>

			<template #footer>
				<Button label="OK" icon="pi pi-check" autofocus
					@click="displayInterfacesDialog = false" />
			</template>
		</Dialog>

		<LoadingBlocker :loading="loading" :message="loadingMessage" />
	</section>
</template>

<script src="@/src/js/pipelines/pipelines.js" scoped />
<style src="@/src/scss/pipelines/pipelines.scss" lang="scss" scoped />
