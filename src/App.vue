<template>
  <div id="app">
    <!-- 메인 앱 (로그인 화면 포함 모든 라우트 뷰) -->
    <div class="main-app flex flex-col h-screen overflow-hidden">
      <!-- 메인 콘텐츠 영역 (flex-1로 남은 공간 차지) -->
      <main :class="contentClass" class="flex-1 overflow-hidden relative">
        <router-view v-slot="{ Component }: { Component: any }">
          <component
            :is="Component"
            @logout="handleLogout"
            @request-logout="handleLogoutClick"
            @login-success="handleLoginSuccess"
          />
        </router-view>
      </main>

      <!-- 탭 네비게이션 (로그인 화면이 아닐 때만 표시) -->
      <div
        v-if="showTabs"
        class="shrink-0 z-20 w-full h-[48px] bg-white/90 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.03)] px-3 flex items-center justify-between transition-all duration-300"
      >
        <div
          ref="scrollContainer"
          class="flex-1 min-w-0 flex items-center h-full gap-1.5 overflow-x-auto no-scrollbar mask-gradient-r"
        >
          <div
            v-for="tab in tabs"
            :key="tab.name"
            :ref="(el) => setTabRef(el, tab.name)"
            :class="[
              'flex items-center justify-center gap-2 px-3 h-[38px] rounded-lg cursor-pointer text-[13px] font-medium transition-all duration-200 select-none whitespace-nowrap',
              currentRouteName === tab.name
                ? 'bg-blue-50/80 text-blue-600 shadow-sm ring-1 ring-blue-100'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
            ]"
            @click="handleTabClick(tab.name)"
            :title="tab.label"
          >
            <!-- 아이콘: 항상 표시 -->
            <span class="material-icons text-[18px] opacity-90">{{
              tab.icon
            }}</span>
            <!-- 라벨: 1200px 이상에서만 표시 -->
            <span class="hidden xl:block tracking-tight">{{ tab.label }}</span>
          </div>
        </div>

        <!-- Language Switcher -->
        <div
          class="flex-shrink-0 flex items-center pl-2 ml-2 border-l border-slate-200 h-[24px] gap-2"
        >
          <LanguageSwitcher :direction="'up'" />

          <!-- 로그아웃 버튼 (로그인 모드에서만 표시) -->
          <BaseButton
            v-if="requiresAuth"
            class="group bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 shadow-sm hover:shadow"
            variant="secondary"
            size="sm"
            rounded="full"
            @click="handleLogoutClick"
            title="로그아웃"
          >
            <div class="flex items-center gap-1.5">
              <span
                class="material-icons text-[18px] text-slate-400 transition-transform duration-300 group-hover:text-red-500 group-hover:-translate-x-0.5 leading-none"
                >logout</span
              >
              <span
                class="hidden xl:inline font-medium text-[13px] leading-none pt-[1px]"
                >{{ $t("common.logout") }}</span
              >
            </div>
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- 로그아웃 모달 -->
    <BaseModal
      v-if="requiresAuth"
      v-model="showLogoutConfirmModal"
      size="sm"
      :show-close-button="false"
      class="max-w-md"
    >
      <!-- 1단계: 로그아웃 확인 -->
      <div v-if="!isLogoutProcessing" class="p-4 text-center">
        <div
          class="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
        >
          <span class="material-icons text-3xl">logout</span>
        </div>
        <h3 class="text-2xl font-bold text-slate-900 mb-2">
          {{ $t("auth.logoutConfirmTitle") }}
        </h3>
        <p
          class="text-slate-500 mb-8 leading-relaxed"
          v-html="$t('auth.logoutConfirmMessage').replace('{br}', '<br>')"
        ></p>
        <div class="flex gap-3">
          <BaseButton
            class="flex-1 py-3"
            variant="secondary"
            size="lg"
            rounded="lg"
            @click="closeLogoutConfirmModal"
          >
            {{ $t("common.cancel") }}
          </BaseButton>
          <BaseButton
            class="flex-1 py-3"
            variant="danger"
            size="lg"
            rounded="lg"
            shadow="lg"
            @click="confirmLogout"
          >
            {{ $t("common.logout") }}
          </BaseButton>
        </div>
      </div>

      <!-- 2단계: 데이터 저장 완료 -->
      <div v-else class="p-6 text-center">
        <div
          class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce-short"
        >
          <span class="material-icons text-4xl">check</span>
        </div>
        <h3 class="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
          {{ $t("auth.savedTitle") }}
        </h3>
        <p class="text-slate-500 mb-8 leading-relaxed">
          <span v-html="$t('auth.savedMessage').replace('{br}', '<br>')"></span>
        </p>

        <div
          class="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8 shadow-inner"
        >
          <div
            class="h-full bg-emerald-500 transition-all duration-300 ease-linear"
            :style="{ width: timerProgress + '%' }"
          ></div>
        </div>

        <BaseButton
          class="w-full py-3.5 shadow-lg shadow-blue-500/20"
          variant="primary"
          size="lg"
          rounded="xl"
          @click="handleLogoutComplete"
        >
          {{ $t("auth.goToLoginNow") }}
        </BaseButton>
      </div>
    </BaseModal>

    <!-- Toast Container (Global) -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ToastContainer from "./components/DataInputVirtualScroll/parts/ToastContainer.vue";
import BaseModal from "./components/Common/BaseModal.vue";
import BaseButton from "./components/Common/BaseButton.vue";
import LanguageSwitcher from "./components/Common/LanguageSwitcher.vue";
import { showConfirmToast } from "./components/DataInputVirtualScroll/logic/toast";
import { logEnvironmentInfo } from "./utils/environmentUtils";
import { useAppAuth } from "./composables/useAppAuth";
import { useAppNavigation } from "./composables/useAppNavigation";

// --- Initialization ---
logEnvironmentInfo();

// --- Composables ---
const {
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
} = useAppAuth();

const {
  tabs,
  showTabs,
  contentClass,
  currentRouteName,
  scrollContainer,
  setTabRef,
  handleTabClick
} = useAppNavigation(isAuthenticated, isAdmin, requiresAuth);

const timerProgress = computed(() => {
  const totalTime = 1500; // 1.5s
  const elapsed = totalTime - remainingSeconds.value * 1000;
  return Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
});

// --- Initial Auth Check ---
updateAuthState();

if (!requiresAuth.value) {
  if (!isAuthenticated.value) {
    console.log("🚀 비로그인 모드로 실행됨 (공개 페이지)");
    loadInitialData();
  } else {
    console.log("✅ 공개 페이지지만 로그인 상태임");
    checkAuthAndLoadData();
  }
} else {
  if (isAuthenticated.value) {
    checkAuthAndLoadData();
  }
}
</script>

<style>
@import "./App.css";
</style>