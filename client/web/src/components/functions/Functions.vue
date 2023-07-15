<template>
	<section :class="functionsClass">
		<Header
			@authenticate="async () => { await doAuth() }" />

		<div class="data-view-holder">
			<DataView :value="functions" :layout="functionsLayout" :lazy="true"
				:paginator="true" :rows="functionsSearchLimit" :totalRecords="functionsSearchResults" @page="functionsPage($event)"
				paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
				:rowsPerPageOptions="[3,5,10,20,50]">
				<template #header>
					<div class="flex justify-content-end">
						<DataViewLayoutOptions v-model="functionsLayout" />
					</div>
				</template>

				<template #list="slotProps">
					<div class="col-12">
						<div class="flex flex-column xl:flex-row xl:align-items-start p-4 gap-4">
							<img class="w-9 sm:w-16rem xl:w-10rem shadow-2 block xl:block mx-auto border-round clickable" src="@/assets/Bacalhau-WA.png" :alt="slotProps.data.name"
								@click="showFunction(slotProps.data)" />
							<div class="flex flex-column sm:flex-row justify-content-between align-items-center xl:align-items-start flex-1 gap-4">
								<div class="flex flex-column align-items-center sm:align-items-start gap-2">
									<div class="flex align-items-center gap-2">
										<div class="text-2xl font-bold text-900 clickable"
											@click="showFunction(slotProps.data)">{{ slotProps.data.name }}</div>
										<Tag class="clickable" :value="$t('message.dashboard.body.ipld')" severity="info"
											@click="showIpldDialog(slotProps.data.cid)"></Tag>
									</div>
									<div class="text-xs text-300">{{ moment(slotProps.data.timestamp).format('YYYY-MM-DD HH:mm') }}</div>
									<div class="text-sm text-300">{{ slotProps.data.description }}</div>
									<Rating :modelValue="(slotProps.data.rating) ? slotProps.data.rating : 0" :cancel="false"></Rating>
									<div class="flex align-items-center gap-3">
										<span class="flex align-items-center gap-2">
											<i class="pi pi-tag"></i>
											<span class="font-semibold">{{ slotProps.data.function_type }}</span>
										</span>
										<Tag :value="(slotProps.data.retired) ? this.$t('message.functions.retired') : this.$t('message.functions.active')" :severity="(slotProps.data.retired) ? 'warning' : 'success'"></Tag>
									</div>
									<div class="flex align-items-center gap-2">
										<Button size="small" type="button" :label="$t('message.functions.inputs')" icon="pi pi-sign-in" :badge="slotProps.data.input_types.length.toString()" badgeClass="p-badge-primary" outlined
											@click="showInterfaces(slotProps.data, 'inputs')" />
										<Button size="small" type="button" :label="$t('message.functions.outputs')" icon="pi pi-sign-out" :badge="slotProps.data.output_types.length.toString()" badgeClass="p-badge-primary" outlined
											@click="showInterfaces(slotProps.data, 'outputs')" />
									</div>
								</div>
								<div class="flex sm:flex-column align-items-center sm:align-items-end gap-3 sm:gap-2">
									<span class="text-2xl font-semibold">${{ 'FREE' }}</span>
									<Button icon="pi pi-play" rounded disabled
										@click="navigate(`/pipelines/create/${slotProps.data.cid}`)"></Button>
								</div>
							</div>
						</div>
					</div>
				</template>

				<template #grid="slotProps">
					<div class="col-12 sm:col-6 lg:col-12 xl:col-4 p-2">
						<div class="p-4 border-1 surface-border surface-card border-round">
							<div class="flex flex-wrap align-items-center justify-content-between gap-2">
								<div class="flex align-items-center gap-2">
									<i class="pi pi-tag"></i>
									<span class="font-semibold">{{ slotProps.data.function_type }}</span>
								</div>
								<Tag :value="(slotProps.data.retired) ? this.$t('message.functions.retired') : this.$t('message.functions.active')" :severity="(slotProps.data.retired) ? 'warning' : 'success'"></Tag>
							</div>
							<div class="flex flex-column align-items-center gap-2 py-5">
								<img class="w-9 shadow-2 border-round clickable" src="@/assets/Bacalhau-WA.png" :alt="slotProps.data.name"
									@click="showFunction(slotProps.data)" />
								<div class="flex align-items-center gap-2">
									<div class="text-2xl font-bold clickable"
										@click="showFunction(slotProps.data)">{{ slotProps.data.name }}</div>
									<Tag class="clickable" :value="$t('message.dashboard.body.ipld')" severity="info"
										@click="showIpldDialog(slotProps.data.cid)"></Tag>
								</div>
								<div class="text-xs text-300">{{ moment(slotProps.data.timestamp).format('YYYY-MM-DD HH:mm') }}</div>
								<div class="text-sm text-300">{{ slotProps.data.description }}</div>
								<Rating :modelValue="(slotProps.data.rating) ? slotProps.data.rating : 0" :cancel="false"></Rating>
								<div class="flex align-items-center gap-2">
									<Button size="small" type="button" :label="$t('message.functions.inputs')" icon="pi pi-sign-in" :badge="slotProps.data.input_types.length.toString()" badgeClass="p-badge-primary" outlined
										@click="showInterfaces(slotProps.data, 'inputs')" />
									<Button size="small" type="button" :label="$t('message.functions.outputs')" icon="pi pi-sign-out" :badge="slotProps.data.output_types.length.toString()" badgeClass="p-badge-primary" outlined
										@click="showInterfaces(slotProps.data, 'outputs')" />
								</div>
							</div>
							<div class="flex align-items-center justify-content-between">
								<span class="text-2xl font-semibold">${{ 'FREE' }}</span>
								<Button icon="pi pi-play" rounded disabled
									@click="navigate(`/pipelines/create/${slotProps.data.cid}`)"></Button>
							</div>
						</div>
					</div>
				</template>
			</DataView>
		</div>

		<div class="heading"
			v-if="!formVisible">
			<Button :label="$t('message.functions.create-function')" icon="pi pi-cloud-upload" class="p-button-success"
				@click="newFunction" />
		</div>
		<div class="main-container" 
			v-else>
			<div class="grid-container">
				<div class="form-container">
					<div>
						<div class="heading">{{ $t('message.functions.create-function') }}</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<InputText inputId="functionName" v-model="functionName" />
									<label for="functionName">{{ $t('message.functions.function-name') + ' *' }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<Textarea inputId="functionDescription" v-model="functionDescription" :autoResize="false" rows="5" cols="45" />
									<label for="functionDescription">{{ $t('message.functions.function-description') }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<Dropdown inputId="functionType" v-model="functionType" :options="functionTypes"
										:placeholder="$t('message.functions.function-type') + ' *'" />
									<label for="functionType">{{ $t('message.functions.function-type') + ' *' }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<InputText inputId="functionContainer" v-model="functionContainer" />
									<label for="functionContainer">{{ $t('message.functions.function-container') + ' *' }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<InputText inputId="functionCommands" v-model="functionCommands" />
									<label for="functionCommands">{{ $t('message.functions.function-commands') }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<InputText inputId="functionJobParameters" v-model="functionJobParameters" />
									<label for="functionJobParameters">{{ $t('message.functions.job-parameters') }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<AutoComplete v-model="functionInputs" inputId="functionInputs" multiple
										:placeholder="$t('message.functions.function-inputs')"
										optionLabel="name"
										:suggestions="functionInputItems" @complete="functionInputsComplete" />
									<label for="functionInputs">{{ $t('message.functions.function-inputs') }}</label>
								</span>
							</div>
						</div>
						<div class="schema-name">
							<div class="schema-name-input">
								<span class="p-float-label">
									<AutoComplete v-model="functionOutputs" inputId="functionOutputs" multiple
										:placeholder="$t('message.functions.function-outputs')"
										optionLabel="name"
										:suggestions="functionOutputItems" @complete="functionOutputsComplete" />
									<label for="functionOutputs">{{ $t('message.functions.function-outputs') }}</label>
								</span>
							</div>
						</div>
						<div class="controls">
							<Button :label="$t('message.shared.create')" icon="pi pi-cloud-upload" class="p-button-success"
								:disabled="createDisabled"
								@click="addFunction" />
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
						<div class="text-2xl font-bold clickable"
							@click="$router.push(`/templates/${iface.cid}`)">{{ iface.name }}</div>
						<Tag class="clickable" :value="$t('message.shared.show')" severity="info"
							@click="$router.push(`/templates/${iface.cid}`)"></Tag>
					</div>
					<div>{{ iface.desctiption }}</div>
					<div>{{ moment(iface.timestamp).format('YYYY-MM-DD HH:MM') }}</div>
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
		<Toast position="top-right" />
	</section>
</template>

<script src="@/src/js/functions/functions.js" scoped />
<style src="@/src/scss/functions/functions.scss" lang="scss" scoped />
