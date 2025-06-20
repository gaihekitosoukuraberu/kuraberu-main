const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  publicPath: process.env.NODE_ENV === 'production' ? '/franchise-hearing/' : '/',
  
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        '__VUE_OPTIONS_API__': 'true',
        '__VUE_PROD_DEVTOOLS__': 'false',
        '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false'
      })
    ]
  }
})