const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.tsx',
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: isProduction,
            configFile: 'tsconfig.frontend.json',
          },
        },
        exclude: [/node_modules/, /\.test\.(ts|tsx)$/, /\.spec\.(ts|tsx)$/, /\.polaris\.(ts|tsx)$/],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath) => resourcePath.endsWith('.module.css'),
                localIdentName: isProduction ? '[hash:base64:8]' : '[local]--[hash:base64:5]',
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    filename: isProduction ? '[name].[contenthash].js' : 'bundle.js',
    path: path.resolve(__dirname, 'public'),
    publicPath: '/',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),
    // Inject environment variables into the bundle
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.REACT_APP_SHOPIFY_API_KEY': JSON.stringify(process.env.REACT_APP_SHOPIFY_API_KEY || 'development-api-key'),
      'process.env.SHOPIFY_API_KEY': JSON.stringify(process.env.SHOPIFY_API_KEY || ''),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  optimization: {
    splitChunks: isProduction ? {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    } : false,
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
