const path = require("path");
const glob = require("glob");
const webpack = require('webpack');
const { merge } = require('webpack-merge')
const { VueLoaderPlugin } = require('vue-loader');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')

const paths = {
	root: path.resolve(__dirname, './'),
	src: path.resolve(__dirname, './src'),
	build: path.resolve(__dirname, './dist'),
	public: path.resolve(__dirname, './public')
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
	devtool: 'eval-cheap-module-source-map',
	devServer: {
		historyApiFallback: true,
		static: paths.public,
		open: true,
		compress: true,
		hot: true,
		port: 3000,
	}
}

const common = {
	entry: {
		"./styles" : glob.sync("./src/scss/**/*.scss"),
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
		new webpack.HotModuleReplacementPlugin(),
		new VueLoaderPlugin(),
		new RemoveEmptyScriptsPlugin(),
		new MiniCssExtractPlugin( {
			filename: "[name].min.css",
			chunkFilename: "chunks/[name].min.css"
		} ),
		new webpack.DefinePlugin({
			__VUE_OPTIONS_API__: true,
			__VUE_PROD_DEVTOOLS__: false,
		}),
		new webpack.SourceMapDevToolPlugin({
			filename: '[file].map'
		}),
		new HtmlWebpackPlugin({
			favicon: paths.public + '/favicon.ico',
			template: paths.public + '/index.html', // template file
			filename: 'index.html', // output file,
			minify: false
		})
	],
	resolve: {
		alias: {
			'@': paths.root
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
							presets: ['@babel/env'],
							plugins: ['@babel/plugin-syntax-dynamic-import']
						}
					},
					'source-map-loader'
				]
			},
			{
				test: /\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							sourceMap: true
						}
					},
					{
						loader: "sass-loader",
						options: {
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							url: false,
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: {
					loaders: {
						'scss': [
							'vue-style-loader',
							'css-loader',
							'sass-loader'
						],
						'sass': [
							'vue-style-loader',
							'css-loader',
							'sass-loader?indentedSyntax'
						]
					}
				}
			},
			{
				test: /\.(png|jpe?g|gif)$/,
				type: 'asset/resource',
				generator: {
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /\.(mp4)$/,
				type: 'asset/resource',
				generator: {
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /^(?!.*(\.c\.svg)).*\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /\.c.svg$/,
				use: [
					'vue-loader',
					'vue-svg-loader',
				]
			},
			{
				test: /\.(eot|ttf|woff|woff2)(\?.+)?$/,
				type: 'asset/resource',
				generator: {
					filename: 'asset/[hash].[ext]'
				}
			}
		]
	}
}

module.exports = (cmd) => {
	const production = cmd.production
	const config = production ? prod : dev

	return merge(common, config)
}
  