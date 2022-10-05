const path = require("path")
const glob = require("glob")
const webpack = require('webpack')
const { merge } = require('webpack-merge')
//const Dotenv = require('dotenv-webpack')

const paths = {
	root: path.resolve(__dirname, './'),
	src: path.resolve(__dirname, './src'),
	build: path.resolve(__dirname, './dist')
}

const prod = {
	mode: "production",
	devtool: false,
	performance: {
		hints: false
	}
}

const dev = {
	mode: "development",
	devtool: 'eval-cheap-module-source-map'
}

const common = {
	entry: {
		"./scripts" : glob.sync("./src/js/**/*.js")
	},
	output: {
		path: paths.build,
		publicPath: "/dist/",
		filename: "[name].min.js",
		chunkFilename: "chunks/[name].min.js",
		clean: true
	},
	plugins: [
//		new Dotenv()
	],
	resolve: {
		alias: {
			'@': paths.root
		},
		fallback: {
			"https": false
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env'],
							plugins: ['@babel/plugin-syntax-dynamic-import']
						}
					},
					'source-map-loader'
				]
			}
		]
	}
}

module.exports = (cmd) => {
	const production = cmd.production
	const config = production ? prod : dev

	return merge(common, config)
}
  
