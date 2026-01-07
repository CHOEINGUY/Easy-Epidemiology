// main.js (또는 Vue 앱 엔트리 파일)
import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router/index.js'; // Vue Router

// StoreBridge import
import { StoreBridge } from './store/storeBridge.js';
import { UserManager } from './auth/UserManager.js';



// Logger import
import { createComponentLogger } from './utils/logger.js';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); // Pinia 연결
app.use(router); // Vue Router 연결

// Logger 초기화
const logger = createComponentLogger('Main');

// 개발 환경 설정
const isDevelopment = import.meta.env?.MODE === 'development' || false;

// StoreBridge 초기화 (Pinia 사용 시 legacyStore는 null로 전달 후 내부에서 Pinia store 연결)
const storeBridge = new StoreBridge(null, null, { 
  debug: isDevelopment 
});

// 사용자 관리자 초기화
const userManager = new UserManager();
// legacyStore 설정 제거
// storeBridge.setLegacyStore(store);

// 전역 StoreBridge 설정
window.storeBridge = storeBridge;
window.userManager = userManager;

// Vuex 호환성을 위한 전역 $store 주입 (Shim 사용)
// 이를 통해 Options API 컴포넌트에서 this.$store 사용 가능
app.config.globalProperties.$store = storeBridge.legacyStore;

// 전역 자동 저장 (모든 상태 변경 감지)
// StoreBridge 내부에서 Pinia 구독을 통해 처리하도록 변경됨
// let saveTimeout = null;

// 개발 환경에서만 전역 디버깅 객체 노출
if (isDevelopment) {
  window.$debug = {
    // store, // Vuex store 제거
    storeBridge: window.storeBridge
  };
}

if (isDevelopment) {
  logger.info('Easy-Epidemiology Web v2.0 - Development Mode');
}



// Service Worker 등록 (오프라인 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        logger.info('SW registered: ', registration);
      })
      .catch(registrationError => {
        logger.error('SW registration failed: ', registrationError);
      });
  });
}

app.mount('#app');
