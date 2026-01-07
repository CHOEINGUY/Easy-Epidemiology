<template>
  <div id="app">
    <!-- 메인 앱 (로그인 화면 포함 모든 라우트 뷰) -->
    <div class="main-app">
      <!-- 메인 콘텐츠 영역 -->
      <main :class="contentClass">
        <router-view v-slot="{ Component }">
          <component 
            :is="Component" 
            @logout="handleLogout" 
            @login-success="handleLoginSuccess"
          />
        </router-view>
      </main>
      
      <!-- 탭 네비게이션 (로그인 화면이 아닐 때만 표시) -->
      <div v-if="showTabs" class="tabs">
        <div class="tabs-left">
          <div
            v-for="tab in tabs"
            :key="tab.name"
            :class="['tab', currentRouteName === tab.name ? 'active' : '']"
            @click="handleTabClick(tab.name)"
            :title="tab.label"
          >
            <span class="material-icons tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </div>
        </div>
        
        <!-- 로그아웃 버튼 (로그인 모드에서만 표시) -->
        <div v-if="requiresAuth" class="logout-section">
          <button 
            class="logout-btn" 
            @click="handleLogoutClick"
            title="로그아웃"
          >
            <span class="material-icons">logout</span>
            로그아웃
          </button>
        </div>
      </div>
    </div>
    
    <!-- 로그아웃 모달 (로그인 모드에서만 표시) -->
    <div v-if="requiresAuth && showLogoutConfirmModal" class="modal-overlay" @click="closeLogoutConfirmModal">
      <div class="modal-content" @click.stop>
        <!-- 1단계: 로그아웃 확인 -->
        <div v-if="!isLogoutProcessing" class="logout-confirm-step">
          <div class="warning-icon-large">
            <span class="material-icons">logout</span>
          </div>
          <h3 class="modal-title">로그아웃</h3>
          <p class="modal-message">
            로그아웃하시겠습니까?<br>
            모든 데이터는 안전하게 저장됩니다.
          </p>
          <div class="modal-actions">
            <button class="secondary-btn" @click="closeLogoutConfirmModal">
              취소
            </button>
            <button class="primary-btn" @click="confirmLogout">
              로그아웃
            </button>
          </div>
        </div>
        
        <!-- 2단계: 데이터 저장 완료 -->
        <div v-else class="logout-success-step">
          <div class="success-icon-large">
            <span class="material-icons">check_circle</span>
          </div>
          <h3 class="modal-title">데이터가 안전하게 저장되었습니다!</h3>
          <p class="modal-message">
            모든 데이터가 안전하게 저장되었습니다.<br>
            잠시 후 로그인 화면으로 이동합니다.
          </p>
          <div class="modal-timer">
            <div class="timer-bar">
              <div class="timer-progress" :style="{ width: timerProgress + '%' }"></div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="secondary-btn" @click="closeLogoutConfirmModal">
              지금 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Components are now loaded via Router, so we only need shared UI components if any
import ToastContainer from './components/DataInputVirtualScroll/parts/ToastContainer.vue';
import { showConfirmToast } from './components/DataInputVirtualScroll/logic/toast.js';
import { tokenManager } from './services/authApi.js';
import { isAuthRequired, logEnvironmentInfo } from './utils/environmentUtils.js';

export default {
  name: 'App',
  components: {
    ToastContainer
  },
  data() {
    return {
      isAuthenticated: false,
      currentUser: null,
      isAdmin: false,
      showLogoutConfirmModal: false, // 로그아웃 모달 표시 여부
      isLogoutProcessing: false, // 로그아웃 처리 중 여부 (모달 단계 제어)
      logoutModalTimer: null, // 자동 전환 타이머
      remainingSeconds: 1.5, // 남은 시간 (초)
      
      // 기본 탭 구성
      baseTabs: [
        {
          name: 'DataInputVirtual',
          label: '데이터 입력',
          icon: 'table_chart'
        },
        {
          name: 'PatientCharacteristics',
          label: '환자특성',
          icon: 'accessibility_new'
        },
        {
          name: 'EpidemicCurve',
          label: '유행곡선',
          icon: 'show_chart'
        },
        {
          name: 'ClinicalSymptoms',
          label: '임상증상',
          icon: 'sick'
        },
        {
          name: 'CaseControl',
          label: '환자대조군(OR)',
          icon: 'compare_arrows'
        },
        {
          name: 'CohortStudy',
          label: '코호트(RR)',
          icon: 'groups'
        },
        {
          name: 'CaseSeries',
          label: '사례군조사',
          icon: 'list_alt'
        },
        {
          name: 'ReportWriter',
          label: '보고서 작성',
          icon: 'edit_note'
        },
        {
          name: 'HomePage',
          label: '웹페이지 정보',
          icon: 'info'
        }
      ]
    };
  },
  computed: {
    // 로그인이 필요한지 확인
    requiresAuth() {
      return isAuthRequired();
    },
    
    currentRouteName() {
      return this.$route.name;
    },
    
    showTabs() {
      return this.currentRouteName !== 'Login' && (!this.requiresAuth || this.isAuthenticated);
    },
    
    tabs() {
      const tabs = [...this.baseTabs];
      
      // 관리자 패널 탭 추가 (로그인 모드에서만)
      if (this.requiresAuth && this.isAdmin) {
        tabs.push({
          name: 'AdminPanel',
          label: '관리자 패널',
          icon: 'admin_panel_settings'
        });
      }
      
      return tabs;
    },
    
    contentClass() {
      if (this.currentRouteName === 'DataInputVirtual' || this.currentRouteName === 'ReportWriter') {
        return 'content no-scroll';
      }
      return 'content scrollable';
    },
    
    // 타이머 진행률 계산
    timerProgress() {
      const totalTime = 1500; // 1.5초
      const elapsed = totalTime - (this.remainingSeconds * 1000);
      return Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
    }
  },
  created() {
    // 환경 정보 로깅
    logEnvironmentInfo();
    
    // 비로그인 모드인 경우
    if (!this.requiresAuth) {
      this.isAuthenticated = true;
      console.log('🚀 비로그인 모드로 실행됨');
      this.loadInitialData();
      return;
    }
    
    // 로그인 모드인 경우
    this.updateAuthState();
    
    // 인증 상태 체크 및 자동 로그인
    // 이미 로그인되어 있다면 데이터를 로드합니다.
    if (this.isAuthenticated) {
      this.checkAuthAndLoadData();
    }
  },
  
  methods: {
    async checkAuthAndLoadData() {
      try {
        // 토큰 유효성 확인
        const isValid = await tokenManager.validateToken();
        
        if (isValid) {
          // 로그인된 경우 인증 상태 업데이트
          this.updateAuthState();
          console.log('✅ 토큰 유효 - 로그인 상태 복원됨');
          
          // 기존 데이터 로드
          this.loadInitialData();
        } else {
          // 로그인되지 않은 경우 인증 상태 초기화
          this.updateAuthState();
          console.log('❌ 토큰 무효 - 로그인 상태 아님');
          
          if (this.$route.name !== 'Login') {
            this.$router.push({ name: 'Login' });
          }
        }
      } catch (error) {
        console.error('인증 체크 실패:', error);
        // 에러가 발생해도 인증 상태 업데이트
        this.updateAuthState();
        
        if (this.isAuthenticated) {
          this.loadInitialData();
        }
      }
    },
    
    loadInitialData() {
      // App 컴포넌트가 생성될 때 (앱 시작 시 한 번) StoreBridge를 통해 초기 데이터 로딩
      if (window.storeBridge) {
        window.storeBridge.loadInitialData();
        console.log('App.vue created: StoreBridge를 통해 초기 데이터 로드 완료');
      } else {
        // StoreBridge가 없으면 기존 방식 사용
        this.$store.dispatch('loadInitialData');
        console.log('App.vue created: 기존 방식으로 초기 데이터 로드 완료');
      }
    },
    
    updateAuthState() {
      // 비로그인 모드에서는 인증 상태 확인 불필요
      if (!this.requiresAuth) {
        return;
      }
      
      // 직접 localStorage에서 확인
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      this.isAuthenticated = !!(token && user && (user.isApproved || user.approved));
      this.currentUser = user;
      this.isAdmin = user && (user.role === 'admin' || user.role === 'support');
    },
    
    async handleLoginSuccess() {
      console.log('🎉 handleLoginSuccess 호출됨');
      
      // 로그인 성공 시 데이터 로드
      this.loadInitialData();
      
      // 로그인 성공이므로 바로 상태 설정
      this.isAuthenticated = true;
      this.currentUser = JSON.parse(localStorage.getItem('user'));
      this.isAdmin = this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'support');
      
      // DataInputVirtual 탭으로 이동
      this.$router.push({ name: 'DataInputVirtual' });
      
      console.log('로그인 후 상태:', {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        isAdmin: this.isAdmin
      });
    },
    
    // 비동기 상태 업데이트 함수 추가
    async updateAuthStateAsync() {
      console.log('🔄 updateAuthStateAsync 시작');
      
      // localStorage 데이터가 반영될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 직접 localStorage에서 확인
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      this.isAuthenticated = !!(token && user && (user.isApproved || user.approved));
      this.currentUser = user;
      this.isAdmin = user && (user.role === 'admin' || user.role === 'support');
      
      console.log('✅ updateAuthStateAsync 완료:', {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        isAdmin: this.isAdmin,
        token: !!token,
        user: !!user
      });
    },
    
    handleLogout() {
      // 로그인 모드에서만 로그아웃 처리
      if (this.requiresAuth) {
        this.updateAuthState();
        this.$router.push({ name: 'Login' });
      }
    },
    
    handleLogoutClick() {
      // 로그인 모드에서만 로그아웃 모달 표시
      if (this.requiresAuth) {
        this.showLogoutConfirmModal = true;
      }
    },
    
    // 로그아웃 모달 닫기
    closeLogoutConfirmModal() {
      this.showLogoutConfirmModal = false;
      this.isLogoutProcessing = false;
      
      if (this.logoutModalTimer) {
        clearInterval(this.logoutModalTimer);
        this.logoutModalTimer = null;
      }
      
      this.remainingSeconds = 1.5;
    },
    
    // 로그아웃 실행
    async confirmLogout() {
      try {
        console.log('🚪 로그아웃 시작');
        
        // 모달을 2단계로 전환
        this.isLogoutProcessing = true;
        
        // Store의 logout 액션을 통해 로그아웃 처리
        await this.$store.dispatch('auth/logout');
        
        // 상태 업데이트를 더 안정적으로 처리
        await this.updateAuthStateAsync();
        
        // Vue의 반응성 업데이트를 기다림
        await this.$nextTick();
        
        console.log('✅ 로그아웃 완료');
        
        // 타이머 시작
        this.remainingSeconds = 1.5;
        this.startLogoutTimer();
      } catch (error) {
        console.error('❌ 로그아웃 실패:', error);
        showConfirmToast('로그아웃 중 오류가 발생했습니다.', null, null);
        // 오류 시 모달 닫기
        this.closeLogoutConfirmModal();
      }
    },
    
    // 로그아웃 타이머 시작
    startLogoutTimer() {
      this.logoutModalTimer = setInterval(() => {
        this.remainingSeconds--;
        
        if (this.remainingSeconds <= 0) {
          this.closeLogoutConfirmModal();
          this.$router.push({ name: 'Login' });
        }
      }, 1000);
    },
    
    handleTabClick(routeName) {
      // 현재 탭이 DataInputVirtual이고, 다른 탭으로 이동하려는 경우
      if (this.currentRouteName === 'DataInputVirtual' && routeName !== 'DataInputVirtual') {
        // 유효성 검사 오류가 있는지 확인
        const validationErrors = this.$store.state.validationState?.errors;
        const hasErrors = validationErrors && validationErrors.size > 0;
        
        if (hasErrors) {
          // 확인 메시지 표시
          const confirmMessage = `데이터 유효성 오류가 ${validationErrors.size}개 있습니다.\n다른 탭으로 이동하시겠습니까?`;
          
          showConfirmToast(
            confirmMessage,
            () => {
              // 확인 시 탭 전환
              this.$router.push({ name: routeName });
            },
            () => {
              // 취소 시 아무것도 하지 않음 (현재 탭에 머무름)
            }
          );
        } else {
          // 오류가 없으면 바로 전환
          this.$router.push({ name: routeName });
        }
      } else {
        // DataInputVirtual가 아니거나 같은 탭으로의 이동은 바로 처리
        this.$router.push({ name: routeName });
      }
    }
  }
};
</script>

<style>
/* body margin 초기화 */
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

/* 메인 앱 컨테이너 */
.main-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 600px; /* 최소 높이 설정으로 기본 사용성 보장 */
}

#app {
  height: 100vh; /* 화면 높이에 꽉 차게 */
  display: flex; /* Flexbox 레이아웃 사용 */
  flex-direction: column; /* 자식 요소를 세로로 배열 */
}

/* content 영역 스타일 */
.content {
  flex-grow: 1;
  background-color: #f0f0f0; /* Google Sheets와 유사한 배경색 */
  margin-bottom: 37px; /* 탭 높이와 일치시킴 */
}

.content.no-scroll {
  overflow: hidden; /* DataInputVirtual 컴포넌트가 자체 스크롤 관리 */
  margin-bottom: 0; /* DataInputVirtual에서는 외부 여백 제거 */
}

.content.scrollable {
  overflow-y: auto; /* 다른 탭들은 필요시 세로 스크롤 허용 */
}

/* tabs 영역 스타일 */
.tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed; /* 하단 고정 */
  z-index: 1;
  bottom: 0;
  height: 37px;
  width: 100%;
  background-color: #f8f8f8; /* Google Sheets와 유사한 배경색 */
  border-top: 1px solid #ddd; /* Google Sheets와 유사한 테두리 */
  padding: 0 20px;
}

.tabs-left {
  display: flex;
  align-items: center;
}

.logout-section {
  display: flex;
  align-items: center;
  margin-right: 32px;
}

/* 관리자 패널 스타일과 동일하게 적용 */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #dadce0;
  background: white;
  color: #5f6368;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  white-space: nowrap;
}
.logout-btn:hover {
  background: #e8f0fe;
  border-color: #c4c7c5;
}
.logout-btn .material-icons {
  font-size: 16px;
  line-height: 1;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}


/* 각 tab 스타일 */
.tab {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 16px;
  color: #444;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-icon {
  display: none; /* 기본적으로 아이콘 숨김 */
  font-size: 20px;
}

.tab-label {
  display: block;
}

/* 반응형: 화면이 좁아지면 아이콘 표시, 텍스트 숨김 */
@media (max-width: 1200px) {
  .tab {
    padding: 6px 12px;
    justify-content: center;
  }
  
  .tab-icon {
    display: block;
  }
  
  .tab-label {
    display: none;
  }
}

/* ↓↓↓ 추가: 활성 탭이 아닐 때 마우스 오버 효과 */
.tab:not(.active):hover {
  background-color: #dcdcdc; /* 약간 어두운 회색 배경 */
}

.tab.active {
  background-color: #dce5f8;
  color: #2657eb;
  font-weight: bold;
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.success-icon-large {
  margin-bottom: 24px;
}

.success-icon-large .material-icons {
  font-size: 64px;
  color: #4caf50;
}

.warning-icon-large {
  margin-bottom: 24px;
}

.warning-icon-large .material-icons {
  font-size: 64px;
  color: #ff9800;
}

.modal-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.modal-message {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 32px;
}

.modal-timer {
  margin-bottom: 32px;
}

.timer-bar {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timer-progress {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #45a049);
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 1px 3px rgba(76, 175, 80, 0.3);
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.modal-actions .secondary-btn,
.modal-actions .primary-btn {
  min-width: 120px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.modal-actions .secondary-btn {
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.modal-actions .secondary-btn:hover {
  background: #f1f3f4;
  border-color: #c4c7c5;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.modal-actions .primary-btn {
  background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
}

.modal-actions .primary-btn:hover {
  background: linear-gradient(135deg, #3367d6 0%, #2a56c6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
}

.modal-actions .secondary-btn:active,
.modal-actions .primary-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(-20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}
</style>
