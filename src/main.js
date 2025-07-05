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

// StoreBridge 초기화
const storeBridge = new StoreBridge(store, null, { 
  debug: process.env.NODE_ENV === 'development' 
});
storeBridge.setLegacyStore(store);

// StoreBridge를 전역으로 노출 (개발용)
if (process.env.NODE_ENV === 'development') {
  window.storeBridge = storeBridge;
}

// 개발 환경에서 마이그레이션 상태 확인 함수를 전역으로 추가
if (process.env.NODE_ENV === 'development') {
  window.checkMigration = logMigrationStatus;
  window.executeMigration = executeMigration;
  window.getMigrationStatus = getMigrationStatus;
}

app.mount('#app');
