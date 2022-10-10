<template>
	<section :class="headerClass">
		<div class="header-line"></div>
		<div class="header">
			<div class="header-bar">
				<div class="header-bar-home">
					<div class="header-bar-home-circle"
						@click="navigate('/')">
						<img
							src= "/FG_logo.ico"
							class="rounded-circle"
							height="26"
							alt=""
							loading="lazy"
          				/>
					</div>				
				</div>
				<div class="header-bar-rest" />
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/helpers/header.js" scoped />
<style src="@/src/scss/helpers/header.scss" lang="scss" scoped />
