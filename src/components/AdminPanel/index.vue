<template>
  <div class="relative min-h-screen bg-slate-50 font-['Noto_Sans_KR',_sans-serif] overflow-x-hidden transition-colors duration-500">
    <!-- Sophisticated Animated Background -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.015)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(15,23,42,0.015)_1.5px,transparent_1.5px)] bg-[length:60px_60px]"></div>
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px] animate-heroPulse"></div>
      <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[120px] animate-heroPulse delay-700"></div>
    </div>

    <!-- Fixed Header (High-End Glassmorphism) -->
    <header class="sticky top-0 z-[100] bg-slate-900/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-slate-900/40 transition-all duration-500">
      <div class="max-w-[1500px] mx-auto px-6 md:px-10 py-5 flex justify-between items-center">
        <div class="flex flex-col">
          <h1 class="text-xl md:text-2xl font-black text-white tracking-tight">관리자 대시보드</h1>
          <span class="text-[10px] text-primary-400 font-black uppercase tracking-[0.3em] -mt-1">시스템 운영 관리</span>
        </div>
        <button @click="logout" class="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-2xl transition-all duration-300 hover:bg-red-500 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/30 active:scale-95 group">
          <span class="material-icons text-xl transition-transform group-hover:translate-x-1">logout</span>
          로그아웃
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="relative z-10 max-w-[1500px] mx-auto p-6 md:p-10 space-y-10">
      <!-- Statistics High-Visibility Section -->
      <AdminStats :stats="stats" />

      <!-- Tab & Action Navigation Wrapper -->
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-3 flex flex-col xl:flex-row justify-between items-center gap-6 shadow-premium border border-white/40 ring-1 ring-slate-900/5 relative overflow-hidden">
        <!-- Floating Active Tab Decoration -->
        <div class="flex flex-wrap md:flex-nowrap justify-center gap-2 p-1.5 bg-slate-100/50 rounded-2.5xl border border-slate-200/50 w-full xl:w-auto">
          <button 
            @click="activeTab = 'pending'" 
            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-500 relative overflow-hidden group/tab"
            :class="activeTab === 'pending' ? 'bg-white text-primary-600 shadow-premium border border-slate-200 scale-[1.02]' : 'text-slate-500 hover:text-slate-800'"
          >
            <span class="material-icons transition-transform duration-500" :class="activeTab === 'pending' ? 'scale-110' : 'group-hover/tab:scale-110'">hourglass_empty</span>
            <span class="uppercase tracking-widest leading-none">승인 대기 요청</span>
            <span class="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg text-[10px] font-black transition-colors" :class="activeTab === 'pending' ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-500'">{{ pendingUsers.length }}</span>
          </button>
          
          <button 
            @click="activeTab = 'users'" 
            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-500 relative overflow-hidden group/tab"
            :class="activeTab === 'users' ? 'bg-white text-primary-600 shadow-premium border border-slate-200 scale-[1.02]' : 'text-slate-500 hover:text-slate-800'"
          >
            <span class="material-icons transition-transform duration-500" :class="activeTab === 'users' ? 'scale-110' : 'group-hover/tab:scale-110'">group</span>
            <span class="uppercase tracking-widest leading-none">전체 사용자</span>
            <span class="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg text-[10px] font-black transition-colors" :class="activeTab === 'users' ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-500'">{{ allUsers.length }}</span>
          </button>
          
          <button 
            @click="activeTab = 'settings'" 
            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-500 relative overflow-hidden group/tab"
            :class="activeTab === 'settings' ? 'bg-white text-primary-600 shadow-premium border border-slate-200 scale-[1.02]' : 'text-slate-500 hover:text-slate-800'"
          >
            <span class="material-icons transition-transform duration-500" :class="activeTab === 'settings' ? 'scale-110' : 'group-hover/tab:scale-110'">tune</span>
            <span class="uppercase tracking-widest leading-none">사이트 설정</span>
          </button>
        </div>

        <button @click="refreshData" class="w-14 h-14 flex items-center justify-center bg-white text-slate-400 rounded-2.5xl transition-all duration-500 shadow-sm border border-slate-100 hover:text-primary-500 hover:border-primary-200 hover:shadow-xl hover:-translate-y-1 active:scale-90 group/refresh" title="Refresh Dashboard">
          <span class="material-icons text-2xl transition-transform duration-700 group-hover/refresh:rotate-180">refresh</span>
        </button>
      </div>

      <!-- Main Toolbar & Filters Container -->
      <transition enter-active-class="duration-500 ease-out" enter-from-class="opacity-0 -translate-y-4" enter-to-class="opacity-100 translate-y-0">
        <AdminToolbar
          v-if="activeTab !== 'settings'"
          :filters="filters"
          @update:filters="filters = $event"
          v-model:searchQuery="searchQuery"
          :availableOrganizations="availableOrganizations"
          :showBulkApprove="activeTab === 'pending' && filteredPendingUsers.length > 0"
          :selectedCount="selectedCount"
          @clear-search="clearSearch"
          @filter-today="filterToday"
          @bulk-approve="bulkApprove"
        />
      </transition>

      <!-- Active Module Container -->
      <div class="pb-20">
        <transition mode="out-in" enter-active-class="duration-500 ease-out" enter-from-class="opacity-0 translate-y-6" enter-to-class="opacity-100 translate-y-0" leave-active-class="duration-300 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-6">
          <div :key="activeTab">
            <!-- Site Settings -->
            <SiteSettings
              v-if="activeTab === 'settings'"
              :config="siteConfig"
              @update:config="siteConfig = $event"
              @save="saveSettings"
              @reset="resetSettings"
            />

            <!-- User Management Table -->
            <UserTable
              v-else
              :users="activeTab === 'pending' ? filteredPendingUsers : filteredAllUsers"
              :mode="activeTab"
              :selectedUsers="selectedUsers"
              @update:selectedUsers="selectedUsers = $event"
              :currentUser="currentUser"
              :loading="loading"
              @approve="approveUser"
              @reject="rejectUser"
              @delete="deleteUser"
              @change-role="changeUserRole"
            />
          </div>
        </transition>
      </div>
    </div>

    <!-- Notification Engine (Glassmorphism Toast) -->
    <transition 
      enter-active-class="transition-all duration-500 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 translate-y-20 scale-90"
      leave-to-class="opacity-0 translate-y-20 scale-90"
    >
      <div v-if="message" class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] min-w-[400px] bg-slate-900/90 backdrop-blur-xl rounded-[1.5rem] p-5 flex items-center gap-4 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group/toast cursor-pointer" @click="clearMessage">
        <div class="w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg ring-1 ring-white/10" :class="{
          'bg-emerald-500 text-white': messageType === 'success',
          'bg-red-500 text-white': messageType === 'error',
          'bg-primary-500 text-white': messageType === 'info'
        }">
          <span class="material-icons text-2xl animate-bounce">
            {{ messageType === 'success' ? 'verified' : messageType === 'error' ? 'error_outline' : 'info' }}
          </span>
        </div>
        <div class="flex flex-col flex-1 gap-0.5">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-white">{{ messageType === 'success' ? '알림' : '시스템 경고' }}</span>
          <span class="text-sm font-bold text-white tracking-tight">{{ message }}</span>
        </div>
        <button class="w-9 h-9 flex items-center justify-center bg-white/5 text-white/40 rounded-xl hover:bg-white/10 hover:text-white transition-all">
          <span class="material-icons text-[20px]">close</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineEmits } from 'vue';
import { adminApi } from '../../services/authApi.js';
import { loadSiteConfig, updateSiteConfig, resetSiteConfig, siteConfig as defaultConfig } from '../../config/siteConfig.js';
import { useAuthStore } from '../../stores/authStore';
import { getAffiliationTypeLabel } from './utils.js';
import { USER_ROLES } from '../../constants';
// Components
import AdminStats from './AdminStats.vue';
import AdminToolbar from './AdminToolbar.vue';
import UserTable from './UserTable.vue';
import SiteSettings from './SiteSettings.vue';

// Store
const authStore = useAuthStore();

// State
const activeTab = ref('pending');
const pendingUsers = ref([]);
const allUsers = ref([]);
const loading = ref(false);
const message = ref('');
const messageType = ref('info');
const selectedUsers = ref([]);
const searchQuery = ref('');
const siteConfig = ref(loadSiteConfig());
const filters = ref({
  affiliationType: '',
  affiliation: '',
  province: '',
  district: '',
  todayOnly: false
});

// Computed
const currentUser = computed(() => authStore.currentUser);

const stats = computed(() => ({
  total: allUsers.value.length,
  pending: pendingUsers.value.length,
  approved: allUsers.value.filter(user => user.approved).length,
  admin: allUsers.value.filter(user => user.role === USER_ROLES.ADMIN).length
}));

const selectedCount = computed(() => selectedUsers.value.length);

const filteredPendingUsers = computed(() => filterUsers(pendingUsers.value));
const filteredAllUsers = computed(() => filterUsers(allUsers.value));

const availableOrganizations = computed(() => {
  const orgSet = new Set();
  const users = [...pendingUsers.value, ...allUsers.value];
  users.forEach(user => {
    if (
      (!filters.value.affiliationType || user.affiliationType === filters.value.affiliationType) &&
      user.affiliation
    ) {
      orgSet.add(user.affiliation);
    }
  });
  return Array.from(orgSet).sort();
});

// Watchers
watch(activeTab, () => {
  loadData();
  selectedUsers.value = [];
});

// Lifecycle
onMounted(() => {
  loadAllUsers();
  loadData();
});

// Methods
function filterUsers(users) {
  let filtered = users;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(user => {
      return (
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phone && user.phone.includes(query)) ||
        (user.affiliation && user.affiliation.toLowerCase().includes(query)) ||
        (user.affiliationType && getAffiliationTypeLabel(user.affiliationType).includes(query))
      );
    });
  }
  
  if (filters.value.affiliationType) {
    filtered = filtered.filter(user => 
      user.affiliationType === filters.value.affiliationType
    );
  }

  if (filters.value.affiliation) {
    filtered = filtered.filter(user => user.affiliation === filters.value.affiliation);
  }
  
  if (filters.value.todayOnly) {
    const today = new Date().toDateString();
    filtered = filtered.filter(user => {
      const userDate = new Date(user.createdAt).toDateString();
      return userDate === today;
    });
  }
  
  return filtered;
}

async function loadData() {
  loading.value = true;
  try {
    if (activeTab.value === 'pending') {
      await loadPendingUsers();
    } else {
      await loadAllUsers();
    }
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function loadPendingUsers() {
  const result = await adminApi.getPendingUsers();
  if (result.data && result.data.users) {
    pendingUsers.value = result.data.users;
  } else if (result.users) {
    pendingUsers.value = result.users;
  } else if (result.data) {
    pendingUsers.value = Array.isArray(result.data) ? result.data : [result.data];
  } else {
    pendingUsers.value = [];
  }
}

async function loadAllUsers() {
  const result = await adminApi.getAllUsers();
  if (result.data && result.data.users) {
    allUsers.value = result.data.users;
  } else if (result.users) {
    allUsers.value = result.users;
  } else if (result.data) {
    allUsers.value = Array.isArray(result.data) ? result.data : [result.data];
  } else {
    allUsers.value = [];
  }
}

async function refreshData() {
  if (activeTab.value === 'pending') {
    await loadPendingUsers();
    showMessage('승인 대기 사용자 목록이 새로고침되었습니다.', 'success');
  } else {
    await loadAllUsers();
    showMessage('전체 사용자 목록이 새로고침되었습니다.', 'success');
  }
}

function filterToday() {
  filters.value.todayOnly = !filters.value.todayOnly;
  if (filters.value.todayOnly) {
    showMessage('오늘 가입한 사용자만 표시됩니다.', 'info');
  } else {
    showMessage('모든 사용자가 표시됩니다.', 'info');
  }
}

function clearSearch() {
  searchQuery.value = '';
}

async function approveUser(userId) {
  try {
    await adminApi.approveUser(userId);
    showMessage('사용자가 승인되었습니다.', 'success');
    await loadPendingUsers();
    await loadAllUsers();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function rejectUser(userId) {
  if (!confirm('정말로 이 사용자의 등록을 거부하시겠습니까?')) {
    return;
  }
  try {
    await adminApi.rejectUser(userId);
    showMessage('사용자 등록이 거부되었습니다.', 'success');
    await loadPendingUsers();
    await loadAllUsers();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
    return;
  }
  try {
    await adminApi.deleteUser(userId);
    showMessage('사용자가 삭제되었습니다.', 'success');
    await loadAllUsers();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function changeUserRole(user) {
  try {
    await adminApi.updateUserRole(user.id, user.role);
    showMessage('사용자 권한이 변경되었습니다.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
    await loadAllUsers();
  }
}

async function bulkApprove() {
  if (selectedCount.value === 0) return;
  if (!confirm(`선택된 ${selectedCount.value}명의 사용자를 승인하시겠습니까?`)) return;

  try {
    await adminApi.bulkApproveUsers(selectedUsers.value);
    showMessage(`${selectedCount.value}명의 사용자가 승인되었습니다.`, 'success');
    await loadPendingUsers();
    await loadAllUsers();
    selectedUsers.value = [];
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

const emit = defineEmits(['logout']);

function logout() {
  if (confirm('정말로 로그아웃하시겠습니까?')) {
    authStore.logout().then(() => {
      emit('logout');
    }).catch(() => {
      emit('logout');
    });
  }
}

function saveSettings() {
  try {
    updateSiteConfig(siteConfig.value);
    showMessage('설정이 성공적으로 저장되었습니다.', 'success');
  } catch (error) {
    showMessage(`설정 저장에 실패했습니다: ${error.message}`, 'error');
  }
}

function resetSettings() {
  if (confirm('정말로 기본값으로 복원하시겠습니까? 현재 설정이 모두 사라집니다.')) {
    try {
      resetSiteConfig();
      siteConfig.value = JSON.parse(JSON.stringify(defaultConfig));
      showMessage('설정이 기본값으로 복원되었습니다.', 'success');
    } catch (error) {
      showMessage(`설정 복원에 실패했습니다: ${error.message}`, 'error');
    }
  }
}

function showMessage(msg, type = 'info') {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
  }, 3000);
}

function clearMessage() {
  message.value = '';
}
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
