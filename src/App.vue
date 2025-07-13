<template>
  <div id="app">
    <!-- 인증 화면 (비인증 상태) -->
    <AuthScreen 
      v-if="!isAuthenticated" 
      @login-success="handleLoginSuccess"
    />
    
    <!-- 메인 앱 (모든 사용자) -->
    <div v-if="isAuthenticated" class="main-app">
      <!-- 메인 앱 컨텐츠 -->
      <div :class="contentClass">
        <keep-alive>
          <component 
            :is="currentView" 
            @logout="handleLogout"
          ></component>
        </keep-alive>
        <ToastContainer></ToastContainer>
      </div>
      
      <!-- 탭 네비게이션 -->
      <div class="tabs">
        <div
          v-for="tab in tabs"
          :key="tab.name"
          :class="['tab', currentView === tab.component ? 'active' : '']"
          @click="handleTabClick(tab.component)"
        >
          {{ tab.label }}
        </div>
      </div>
      

    </div>
  </div>
</template>

<script>

import DataInputVirtual from './components/DataInputVirtualScroll/DataInputVirtual.vue';
import PatientCharacteristics from './components/PatientCharacteristics.vue';
import EpidemicCurve from './components/EpidemicCurve.vue';
import CaseControl from './components/CaseControl.vue';
import CohortStudy from './components/CohortStudy.vue';
import HomePage from './components/HomePage.vue';
import ClinicalSymptoms from './components/ClinicalSymptoms.vue';
import ToastContainer from './components/DataInputVirtualScroll/parts/ToastContainer.vue';
import AuthScreen from './components/AuthScreen.vue';
import AdminPanel from './components/AdminPanel.vue';
import { showConfirmToast } from './components/DataInputVirtualScroll/logic/toast.js';
import { userManager, tokenManager } from './services/authApi.js';

export default {
  name: 'App', // 컴포넌트 이름 명시 권장
  components: {
    DataInputVirtual,
    PatientCharacteristics,
    EpidemicCurve,
    CaseControl,
    CohortStudy,
    HomePage,
    ClinicalSymptoms,
    ToastContainer,
    AuthScreen,
    AdminPanel
  },
  data() {
    return {
      // --- ↓↓↓ 시작 탭을 DataInputVirtual으로 설정 ---
      currentView: 'DataInputVirtual',
      // --- ↑↑↑ 시작 탭을 DataInputVirtual으로 설정 ---
      isAuthenticated: false,
      currentUser: null,
      isAdmin: false,
      baseTabs: [
        // --- ↓↓↓ 탭 순서는 그대로 유지하거나 원하는 대로 변경 ---
        { name: 'DataInputVirtual', label: '데이터 입력', component: 'DataInputVirtual' },
        {
          name: 'PatientCharacteristics',
          label: '환자특성',
          component: 'PatientCharacteristics'
        },
        {
          name: 'EpidemicCurve',
          label: '유행곡선',
          component: 'EpidemicCurve'
        },
        {
          name: 'ClinicalSymptoms',
          label: '임상증상',
          component: 'ClinicalSymptoms'
        },
        {
          name: 'CaseControl',
          label: '환자대조군(OR)',
          component: 'CaseControl'
        },
        {
          name: 'CohortStudy',
          label: '코호트(RR)',
          component: 'CohortStudy'
        },
        { name: 'HomePage', label: '웹페이지 정보', component: 'HomePage' }
        // --- ↑↑↑ 탭 순서는 그대로 유지하거나 원하는 대로 변경 ---
      ]
    };
  },
  computed: {
    tabs() {
      const tabs = [...this.baseTabs];
      
      // 관리자인 경우 관리자 패널 탭 추가
      if (this.isAdmin) {
        tabs.push({
          name: 'AdminPanel',
          label: '관리자 패널',
          component: 'AdminPanel'
        });
      }
      
      return tabs;
    },
    
    contentClass() {
      if (this.currentView === 'DataInputVirtual') {
        return 'content no-scroll';
      }
      return 'content scrollable';
    }
  },
  created() {
    // 초기 상태 설정
    this.updateAuthState();
    
    // 인증 상태 체크 및 자동 로그인
    this.checkAuthAndLoadData();
  },
  
  methods: {
    async checkAuthAndLoadData() {
      try {
        // 토큰 유효성 확인
        const isValid = await tokenManager.validateToken();
        
        if (isValid) {
          // 로그인된 경우 기존 데이터 로드
          this.loadInitialData();
        } else {
          // 로그인되지 않은 경우 기존 데이터 마이그레이션 시도
          this.loadInitialData();
        }
      } catch (error) {
        console.error('인증 체크 실패:', error);
        // 에러가 발생해도 기본 데이터 로드
        this.loadInitialData();
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
      this.isAuthenticated = userManager.isLoggedIn();
      this.currentUser = userManager.getUser();
      this.isAdmin = userManager.isAdmin();
      
      console.log('updateAuthState 호출됨:', {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        isAdmin: this.isAdmin
      });
    },
    
    async handleLoginSuccess() {
      console.log('handleLoginSuccess 호출됨');
      
      // 로그인 성공 시 데이터 로드
      this.loadInitialData();
      
      // 상태 업데이트
      this.updateAuthState();
      
      // Vue의 반응성 업데이트를 기다림
      await this.$nextTick();
      
      // 모든 사용자는 DataInputVirtual 탭으로 이동
      this.currentView = 'DataInputVirtual';
      
      console.log('로그인 후 상태:', {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        isAdmin: this.isAdmin
      });
    },
    

    
    handleLogout() {
      // 인증 상태 업데이트하여 로그인 화면으로 전환
      this.updateAuthState();
    },
    
    handleTabClick(component) {
      // 현재 탭이 DataInputVirtual이고, 다른 탭으로 이동하려는 경우
      if (this.currentView === 'DataInputVirtual' && component !== 'DataInputVirtual') {
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
              this.currentView = component;
            },
            () => {
              // 취소 시 아무것도 하지 않음 (현재 탭에 머무름)
            }
          );
        } else {
          // 오류가 없으면 바로 전환
          this.currentView = component;
        }
      } else {
        // DataInputVirtual가 아니거나 같은 탭으로의 이동은 바로 처리
        this.currentView = component;
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
  position: fixed; /* 하단 고정 */
  z-index: 1;
  bottom: 0;
  height: 37px;
  width: 100%;
  background-color: #f8f8f8; /* Google Sheets와 유사한 배경색 */
  border-top: 1px solid #ddd; /* Google Sheets와 유사한 테두리 */
  padding-left: 50px;
}

/* 각 tab 스타일 */
.tab {
  padding: 6px 20px;
  cursor: pointer;
  font-size: 16px;
  color: #444;
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
</style>
