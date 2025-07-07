// main.js (또는 Vue 앱 엔트리 파일)
import { createApp } from 'vue';
import App from './App.vue';
import store from './components/store.js'; // 경로 수정: components 폴더

// StoreBridge import
import { StoreBridge } from './store/storeBridge.js';

// 마이그레이션 유틸리티 import
import { logMigrationStatus, executeMigration, getMigrationStatus } from './store/utils/migration.js';

const app = createApp(App);
app.use(store); // Vue 앱에 Vuex 스토어 연결

// 개발 환경 설정
const isDevelopment = import.meta.env?.MODE === 'development' || false;

// StoreBridge 초기화
const storeBridge = new StoreBridge(store, null, { 
  debug: isDevelopment 
});
storeBridge.setLegacyStore(store);

// 전역 StoreBridge 설정
window.storeBridge = storeBridge;

// 개발 환경에서만 전역 디버깅 객체 노출
if (isDevelopment) {
  window.$debug = {
    store,
    storeBridge: window.storeBridge
  };
}

if (isDevelopment) {
  console.log('Easy-Epidemiology Web v1.0 - Development Mode');
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
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

app.mount('#app');
