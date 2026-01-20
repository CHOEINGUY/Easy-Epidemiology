import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useEpidemicStore } from '@/stores/epidemicStore';
import { tokenManager } from '@/services/authApi';
import { isAuthRequired } from '@/utils/environmentUtils';
import { USER_ROLES } from '@/constants';
import type { User } from '@/types/auth';

export function useAppAuth() {
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  const epidemicStore = useEpidemicStore();

  const isAuthenticated = ref(false);
  const currentUser = ref<User | null>(null);
  const isAdmin = ref(false);
  
  // Modal State
  const showLogoutConfirmModal = ref(false);
  const isLogoutProcessing = ref(false);
  const logoutModalTimer = ref<number | null>(null);
  const remainingSeconds = ref(1.5);

  const requiresAuth = computed(() => isAuthRequired());

  function updateAuthState() {
    if (!requiresAuth.value) return;
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    isAuthenticated.value = !!(
      token &&
      user &&
      (user.isApproved || user.approved)
    );
    currentUser.value = user;
    isAdmin.value =
      user &&
      (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPPORT);
  }

  function loadInitialData() {
    // Legacy support removed, direct store call
    epidemicStore.loadInitialData();
    console.log("AppAuth: Pinia Store를 통해 초기 데이터 로드 완료");
  }

  async function checkAuthAndLoadData() {
    try {
      const isValid = await tokenManager.validateToken();
      if (isValid) {
        updateAuthState();
        console.log("✅ 토큰 유효 - 로그인 상태 복원됨");
        loadInitialData();
      } else {
        updateAuthState();
        console.log("❌ 토큰 무효 - 로그인 상태 아님");
        if (route.name !== "Login") {
          router.push({ name: "Login" });
        }
      }
    } catch (error) {
      console.error("인증 체크 실패:", error);
      updateAuthState();
      if (isAuthenticated.value) {
        loadInitialData();
      }
    }
  }

  async function handleLoginSuccess() {
    console.log("🎉 handleLoginSuccess 호출됨");
    loadInitialData();
    isAuthenticated.value = true;
    const userStr = localStorage.getItem("user");
    const u = userStr ? JSON.parse(userStr) : null;
    currentUser.value = u;
    isAdmin.value =
      u && (u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPPORT);

    router.push({ name: "DataInputVirtual" });
  }

  function handleLogout() {
    updateAuthState();
    router.push({ name: "Login" });
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
      console.log("🚪 로그아웃 시작");
      isLogoutProcessing.value = true;
      await authStore.logout();
      
      // Simulate delay/update logic
      await new Promise((resolve) => setTimeout(resolve, 200));
      updateAuthState(); // Sync state

      console.log("✅ 로그아웃 완료");
      remainingSeconds.value = 1.5;
      startLogoutTimer();
    } catch (error) {
      console.error("❌ 로그아웃 실패:", error);
      throw error; // Re-throw to let component handle toast if needed or handle here
    }
  }

  function startLogoutTimer() {
    const step = 0.02;
    logoutModalTimer.value = window.setInterval(() => {
      remainingSeconds.value = Math.max(0, remainingSeconds.value - step);
      if (remainingSeconds.value <= 0) {
        handleLogoutComplete();
      }
    }, 20);
  }

  function handleLogoutComplete() {
    closeLogoutConfirmModal();
    router.push({ name: "Login" });
  }

  return {
    isAuthenticated,
    currentUser,
    isAdmin,
    requiresAuth,
    showLogoutConfirmModal,
    isLogoutProcessing,
    remainingSeconds,
    updateAuthState,
    loadInitialData,
    checkAuthAndLoadData,
    handleLoginSuccess,
    handleLogout,
    handleLogoutClick,
    closeLogoutConfirmModal,
    confirmLogout,
    handleLogoutComplete
  };
}
