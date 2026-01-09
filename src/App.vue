<template>
  <div id="app">
    <!-- 메인 앱 (로그인 화면 포함 모든 라우트 뷰) -->
    <div class="main-app">
      <!-- 메인 콘텐츠 영역 -->
      <main :class="contentClass">
        <router-view v-slot="{ Component }: { Component: any }">
          <component 
            :is="Component" 
            @logout="handleLogout" 
            @login-success="handleLoginSuccess"
          />
        </router-view>
      </main>
      
      <!-- 탭 네비게이션 (로그인 화면이 아닐 때만 표시) -->
      <!-- 탭 네비게이션 (로그인 화면이 아닐 때만 표시) -->
      <div v-if="showTabs" class="fixed bottom-0 z-20 w-full h-[48px] bg-white/90 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.03)] px-3 flex items-center justify-between transition-all duration-300">
        <div class="flex items-center h-full gap-1.5 overflow-x-auto no-scrollbar mask-gradient-r">
          <div
            v-for="tab in tabs"
            :key="tab.name"
            :class="[
              'flex items-center justify-center gap-2 px-3 h-[38px] rounded-lg cursor-pointer text-[13px] font-medium transition-all duration-200 select-none whitespace-nowrap',
              currentRouteName === tab.name 
                ? 'bg-blue-50/80 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
            ]"
            @click="handleTabClick(tab.name)"
            :title="tab.label"
          >
            <!-- 아이콘: 항상 표시 (스타일 개선) -->
            <span class="material-icons text-[18px] opacity-90">{{ tab.icon }}</span>
            <!-- 라벨: 1200px 이상에서만 표시 -->
            <span class="hidden xl:block tracking-tight">{{ tab.label }}</span>
          </div>
        </div>
        
        <!-- 로그아웃 버튼 (로그인 모드에서만 표시) -->
        <div v-if="requiresAuth" class="flex items-center pl-2 ml-2 border-l border-slate-200 h-[24px]">
          <button 
            class="group flex items-center justify-center gap-1.5 px-3 py-1.5 h-[34px] bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all duration-200 text-xs font-semibold shadow-sm hover:shadow-md" 
            @click="handleLogoutClick"
            title="로그아웃"
          >
            <span class="material-icons text-[16px] transition-transform duration-300 group-hover:-translate-x-0.5">logout</span>
            <span class="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 로그아웃 모달 (Tailwind Refactors) -->
    <div v-if="requiresAuth && showLogoutConfirmModal" 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      @click="closeLogoutConfirmModal"
    >
      <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" @click.stop>
        <!-- 1단계: 로그아웃 확인 -->
        <div v-if="!isLogoutProcessing" class="p-8 text-center">
          <div class="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span class="material-icons text-3xl">logout</span>
          </div>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">로그아웃</h3>
          <p class="text-slate-500 mb-8 leading-relaxed">
            정말로 로그아웃하시겠습니까?<br>
            진행 중인 모든 작업은 안전하게 저장됩니다.
          </p>
          <div class="flex gap-3">
            <button 
              class="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-all duration-200 active:scale-95" 
              @click="closeLogoutConfirmModal"
            >
              취소
            </button>
            <button 
              class="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/30 transition-all duration-200 active:scale-95" 
              @click="confirmLogout"
            >
              로그아웃
            </button>
          </div>
        </div>
        
        <!-- 2단계: 데이터 저장 완료 -->
        <div v-else class="p-8 text-center">
          <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span class="material-icons text-3xl">check_circle</span>
          </div>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">저장 완료!</h3>
          <p class="text-slate-500 mb-8 leading-relaxed">
            모든 데이터가 안전하게 저장되었습니다.<br>
            잠시 후 로그인 화면으로 이동합니다.
          </p>
          
          <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-8">
            <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: timerProgress + '%' }"></div>
          </div>

          <button 
            class="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all duration-200 active:scale-95" 
            @click="closeLogoutConfirmModal"
          >
            지금 이동
          </button>
        </div>
      </div>
    </div>
    
    <!-- Toast Container (Global) -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ToastContainer from './components/DataInputVirtualScroll/parts/ToastContainer.vue';
import { showConfirmToast } from './components/DataInputVirtualScroll/logic/toast';
import { tokenManager } from './services/authApi';
import { isAuthRequired, logEnvironmentInfo } from './utils/environmentUtils';
import { useAuthStore } from './stores/authStore';
import { useEpidemicStore } from './stores/epidemicStore';
import { USER_ROLES } from './constants';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const epidemicStore = useEpidemicStore(); // store for validation checks

// --- State ---
const isAuthenticated = ref(false);
const currentUser = ref<any>(null);
const isAdmin = ref(false);
const showLogoutConfirmModal = ref(false);
const isLogoutProcessing = ref(false);
const logoutModalTimer = ref<number | null>(null);
const remainingSeconds = ref(1.5);

// Constants
const baseTabs = [
  { name: 'DataInputVirtual', label: '데이터 입력', icon: 'table_chart' },
  { name: 'PatientCharacteristics', label: '환자특성', icon: 'accessibility_new' },
  { name: 'EpidemicCurve', label: '유행곡선', icon: 'show_chart' },
  { name: 'ClinicalSymptoms', label: '임상증상', icon: 'sick' },
  { name: 'CaseControl', label: '환자대조군(OR)', icon: 'compare_arrows' },
  { name: 'CohortStudy', label: '코호트(RR)', icon: 'groups' },
  { name: 'CaseSeries', label: '사례군조사', icon: 'list_alt' },
  { name: 'ReportWriter', label: '보고서 작성', icon: 'edit_note' },
  { name: 'HomePage', label: '웹페이지 정보', icon: 'info' }
];

// --- Computeds ---
const requiresAuth = computed(() => isAuthRequired());

const currentRouteName = computed(() => route.name);

const showTabs = computed(() => {
  return currentRouteName.value !== 'Login' && (!requiresAuth.value || isAuthenticated.value);
});

const tabs = computed(() => {
  const t = [...baseTabs];
  if (requiresAuth.value && isAdmin.value) {
    t.push({
      name: 'AdminPanel',
      label: '관리자 패널',
      icon: 'admin_panel_settings'
    });
  }
  return t;
});

const contentClass = computed(() => {
  const classes = ['content'];
  
  if (showTabs.value) {
    classes.push('has-tabs');
  }

  if (['DataInputVirtual', 'ReportWriter'].includes(currentRouteName.value as string)) {
    classes.push('no-scroll');
  } else {
    classes.push('scrollable');
  }
  
  return classes.join(' ');
});

const timerProgress = computed(() => {
  const totalTime = 1500; // 1.5s
  const elapsed = totalTime - (remainingSeconds.value * 1000);
  return Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
});

// --- Initialization Logic ---
// Run immediately (like created hook)
logEnvironmentInfo();

if (!requiresAuth.value) {
  isAuthenticated.value = true;
  console.log('🚀 비로그인 모드로 실행됨');
  loadInitialData();
} else {
  updateAuthState();
  if (isAuthenticated.value) {
    checkAuthAndLoadData();
  }
}

// --- Methods ---
async function checkAuthAndLoadData() {
  try {
    const isValid = await tokenManager.validateToken();
    if (isValid) {
      updateAuthState();
      console.log('✅ 토큰 유효 - 로그인 상태 복원됨');
      loadInitialData();
    } else {
      updateAuthState();
      console.log('❌ 토큰 무효 - 로그인 상태 아님');
      if (route.name !== 'Login') {
        router.push({ name: 'Login' });
      }
    }
  } catch (error) {
    console.error('인증 체크 실패:', error);
    updateAuthState(); // Update state even on error (likely false)
    if (isAuthenticated.value) {
      loadInitialData();
    }
  }
}

function loadInitialData() {
  if ((window as any).storeBridge) {
    (window as any).storeBridge.loadInitialData();
    console.log('App.vue created: StoreBridge를 통해 초기 데이터 로드 완료');
  } else {
    // If storeBridge is missing, fallback to explicit load inside components or another store action if needed.
    // The original code dispatched 'loadInitialData' to Vuex root. 
    // In Pinia, we usually call specific store actions.
    // Assuming 'epidemicStore' has 'loadInitialData' (I added it).
    epidemicStore.loadInitialData(); 
    console.log('App.vue created: Pinia Store를 통해 초기 데이터 로드 완료');
  }
}

function updateAuthState() {
  if (!requiresAuth.value) return;
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  isAuthenticated.value = !!(token && user && (user.isApproved || user.approved));
  currentUser.value = user;
  isAdmin.value = user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPPORT);
}

async function handleLoginSuccess() {
  console.log('🎉 handleLoginSuccess 호출됨');
  loadInitialData();
  isAuthenticated.value = true;
  const userStr = localStorage.getItem('user');
  const u = userStr ? JSON.parse(userStr) : null;
  currentUser.value = u;
  isAdmin.value = u && (u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPPORT);
  
  router.push({ name: 'DataInputVirtual' });
  
  console.log('로그인 후 상태:', {
    isAuthenticated: isAuthenticated.value,
    currentUser: currentUser.value,
    isAdmin: isAdmin.value
  });
}

async function updateAuthStateAsync() {
  console.log('🔄 updateAuthStateAsync 시작');
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  isAuthenticated.value = !!(token && user && (user.isApproved || user.approved));
  currentUser.value = user;
  isAdmin.value = user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPPORT);
  
  console.log('✅ updateAuthStateAsync 완료:', {
    isAuthenticated: isAuthenticated.value,
    currentUser: currentUser.value,
    isAdmin: isAdmin.value
  });
}

function handleLogout() {
  if (requiresAuth.value) {
    updateAuthState();
    router.push({ name: 'Login' });
  }
}

function handleLogoutClick() {
  if (requiresAuth.value) {
    showLogoutConfirmModal.value = true;
  }
}

function closeLogoutConfirmModal() {
  showLogoutConfirmModal.value = false;
  isLogoutProcessing.value = false;
  if (logoutModalTimer.value) {
    clearInterval(logoutModalTimer.value);
    logoutModalTimer.value = null;
  }
  remainingSeconds.value = 1.5;
}

async function confirmLogout() {
  try {
    console.log('🚪 로그아웃 시작');
    isLogoutProcessing.value = true;
    
    // Call Pinia action
    await authStore.logout();
    
    await updateAuthStateAsync();
    await nextTick();
    
    console.log('✅ 로그아웃 완료');
    remainingSeconds.value = 1.5;
    startLogoutTimer();
  } catch (error) {
    console.error('❌ 로그아웃 실패:', error);
    showConfirmToast('로그아웃 중 오류가 발생했습니다.');
    closeLogoutConfirmModal();
  }
}

function startLogoutTimer() {
  logoutModalTimer.value = window.setInterval(() => {
    remainingSeconds.value--;
    if (remainingSeconds.value <= 0) {
      closeLogoutConfirmModal();
      router.push({ name: 'Login' });
    }
  }, 1000);
}

function handleTabClick(routeName: string) {
  if (currentRouteName.value === 'DataInputVirtual' && routeName !== 'DataInputVirtual') {
    // Check validation errors from epidemicStore
    // Setup store access: epidemicStore.validationState.errors
    const validationErrors = epidemicStore.validationState.errors;
    const hasErrors = validationErrors && validationErrors.size > 0;
    
    if (hasErrors) {
      const confirmMessage = `데이터 유효성 오류가 ${validationErrors.size}개 있습니다.\n다른 탭으로 이동하시겠습니까?`;
      showConfirmToast(confirmMessage).then((confirmed) => {
        if (confirmed) {
          router.push({ name: routeName });
        }
      });
    } else {
      router.push({ name: routeName });
    }
  } else {
    router.push({ name: routeName });
  }
}
</script>

<style>
@import './App.css';
</style>
