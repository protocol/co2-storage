<template>
	<section :class="pipelinesClass">
		<Header
			@authenticate="async () => { await doAuth() }" />

		<div class="main-container">
			<div class="grid-container">
				<div class="metadata-container error"
					v-if="nonEthereumBrowserDetected">
					<div class="heading">{{ $t('message.shared.non-ethereum-browser-detected') }}</div>
					<div class="euthereum-browsers">
						<div class="browser clickable" @click="open('https://metamask.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/metamask-fox.svg" /></div>
						<div class="browser clickable" @click="open('https://brave.app.link/dapp/form.co2.storage/asset/bafyreiczui4ozc44rxkhz22g7hml7adnao7v7kkrrmv2d4jatdjbtmdare')"><img src="@/assets/Brave-logo-color-RGB.svg" /></div>
					</div>
				</div>
				<div class="metadata-container error"
					v-else-if="!pipelinesSearchCid">
					<div class="heading">{{ $t('message.pipelines.invalid-cid') }}</div>
				</div>
				<div class="form-container"
					v-if="!nonEthereumBrowserDetected && pipelinesSearchCid">
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

		<LoadingBlocker :loading="loading" :message="loadingMessage" />
	</section>
</template>

<script src="@/src/js/pipelines/pipelines.js" scoped />
<style src="@/src/scss/pipelines/pipelines.scss" lang="scss" scoped />
