// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router/index'; // Vue Router
import i18n from './i18n'; // i18n configuration
import './assets/styles/tailwind.css'; // Tailwind CSS


import { UserManager } from './auth/UserManager';

// Logger import
import { createComponentLogger } from './utils/logger';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia); // Pinia 연결
app.use(router); // Vue Router 연결
app.use(i18n); // i18n 연결

// Logger 초기화
const logger = createComponentLogger('Main');

// 개발 환경 설정
const isDevelopment = (import.meta as any).env?.MODE === 'development' || false;



// 사용자 관리자 초기화
const userManager = new UserManager();

// 전역 설정

// (window as any).userManager = userManager; // Removed legacy window pollution

// Vuex 호환성 제거됨

// 전역 자동 저장
// GridService 내부에서 처리됨

// 개발 환경에서만 전역 디버깅 객체 노출
if (isDevelopment) {
  (window as any).$debug = {

  };
}

if (isDevelopment) {
  logger.info('Easy-Epidemiology Web v2.0 - Development Mode');
}

// Service Worker 등록 (오프라인 지원)
// Service Worker 등록 (오프라인 지원 - file:// 프로토콜에서만 동작)
// 온라인 환경에서는 브라우저 캐시 문제 방지를 위해 SW 비활성화 및 기존 SW 제거
if ('serviceWorker' in navigator) {
  const isOfflineProtocol = window.location.protocol === 'file:';

  if (isOfflineProtocol) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          logger.info('SW registered (Offline Mode): ', registration);
        })
        .catch(registrationError => {
          logger.error('SW registration failed: ', registrationError);
        });
    });
  } else {
    // 온라인 모드인 경우 기존에 등록된 SW가 있다면 적극적으로 제거
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister()
          .then(success => {
            if (success) {
              logger.info('Legacy SW unregistered successfully for Online Mode');
              // SW 제거 후 페이지 리로드하여 캐시 없는 깨끗한 상태로 시작할지 결정할 수 있음
              // window.location.reload(); // 너무 공격적일 수 있으므로 로그만 남김
            }
          });
      }
    });
  }
}

app.mount('#app');
