const { defineConfig } = require('@vue/cli-service');
module.exports = defineConfig({
  transpileDependencies: true,
  
  // 프로덕션 배포를 위한 설정
  publicPath: process.env.NODE_ENV === 'production' ? '/webpage_office/' : '/',
  
  // 빌드 최적화 설정
  productionSourceMap: false,

  // 오프라인 실행을 위한 추가 설정
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    }
  },

  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'Easy-Epidemiology Web';
        // 오프라인 실행을 위한 메타 태그 추가
        args[0].meta = {
          ...args[0].meta,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        return args;
      });



    // 외부 리소스 처리
    config.module
      .rule('fonts')
      .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/)
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 10000,
        name: 'fonts/[name].[hash:8].[ext]'
      });
  }
});
