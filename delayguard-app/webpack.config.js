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
      // NOT index.html (LAUNCH_PLAN R6): Vercel's static filesystem check
      // answers `/` from public/index.html before any rewrite reaches the
      // function, so the framed document would bypass Koa and ship with no
      // per-shop `frame-ancestors`. Naming it app.html frees `/` to fall
      // through to Koa, which serves this file via routes/app-document.ts.
      filename: 'app.html',
      // G1 (req 2.2.3): the shopify-api-key meta tag in src/index.html is
      // rendered from this parameter; the CDN app-bridge.js script reads it.
      templateParameters: {
        SHOPIFY_API_KEY:
          process.env.SHOPIFY_API_KEY ||
          process.env.REACT_APP_SHOPIFY_API_KEY ||
          '',
      },
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
    // Matches the R6 filename above, so `/` still serves the SPA locally.
    historyApiFallback: { index: '/app.html' },
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
