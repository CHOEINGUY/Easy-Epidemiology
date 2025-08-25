// main.js (또는 Vue 앱 엔트리 파일)
import { createApp } from 'vue';
import App from './App.vue';
import store from './components/store.js'; // 경로 수정: components 폴더

// StoreBridge import
import { StoreBridge } from './store/storeBridge.js';
import { UserManager } from './auth/UserManager.js';

// 마이그레이션 유틸리티 import
import { logMigrationStatus, executeMigration, getMigrationStatus } from './store/utils/migration.js';

// Logger import
import { createComponentLogger } from './utils/logger.js';

const app = createApp(App);
app.use(store); // Vue 앱에 Vuex 스토어 연결

// Logger 초기화
const logger = createComponentLogger('Main');

// 개발 환경 설정
const isDevelopment = import.meta.env?.MODE === 'development' || false;

// StoreBridge 초기화
const storeBridge = new StoreBridge(store, null, { 
  debug: isDevelopment 
});

// 사용자 관리자 초기화
const userManager = new UserManager();
storeBridge.setLegacyStore(store);

// 전역 StoreBridge 설정
window.storeBridge = storeBridge;
window.userManager = userManager;

// 개발 환경에서만 전역 디버깅 객체 노출
if (isDevelopment) {
  window.$debug = {
    store,
    storeBridge: window.storeBridge
  };
}

if (isDevelopment) {
  logger.info('Easy-Epidemiology Web v1.4 - Development Mode');
}

// 개발 환경에서 마이그레이션 상태 확인 함수를 전역으로 추가
if (isDevelopment) {
  window.checkMigration = logMigrationStatus;
  window.executeMigration = executeMigration;
  window.getMigrationStatus = getMigrationStatus;
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
