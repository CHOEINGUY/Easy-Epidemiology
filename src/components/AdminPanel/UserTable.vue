<template>
  <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium shadow-slate-900/5 overflow-hidden transition-all duration-300">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div class="mb-6 relative">
        <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full scale-150 animate-pulse"></div>
        <span class="material-icons text-6xl text-primary-500 animate-spin relative z-10">sync</span>
      </div>
      <h3 class="text-xl font-black text-slate-900 mb-2">데이터 동기화 중...</h3>
      <p class="text-sm font-medium text-slate-500">잠시만 기다려 주세요.</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center py-32 px-6 text-center bg-slate-50/20">
      <div class="w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner shadow-slate-900/5 bg-white relative group" :class="mode === USER_STATUS.PENDING ? 'text-emerald-500 border border-emerald-100' : 'text-slate-300 border border-slate-100'">
        <div class="absolute inset-0 bg-current transition-opacity duration-300 opacity-0 group-hover:opacity-5 rounded-inherit"></div>
        <span class="material-icons text-6xl transition-transform duration-500 group-hover:scale-110">{{ mode === USER_STATUS.PENDING ? 'verified_user' : 'person_off' }}</span>
      </div>
      <h3 class="text-2xl font-black text-slate-900 mb-3 tracking-tight">{{ mode === USER_STATUS.PENDING ? '모든 요청이 처리되었습니다' : '사용자를 찾을 수 없습니다' }}</h3>
      <p class="text-[15px] font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">{{ mode === USER_STATUS.PENDING ? '새로운 가입 요청이 발생하면 이곳에 표시됩니다.' : '시스템에 등록된 사용자가 없습니다.' }}</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full border-separate border-spacing-0">
        <thead class="sticky top-0 z-30 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100">
          <tr>
            <th v-if="mode === USER_STATUS.PENDING" class="w-16 px-6 py-5 text-center">
              <div class="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="peer h-6 w-6 cursor-pointer appearance-none rounded-xl border-2 border-slate-200 transition-all checked:border-primary-500 checked:bg-primary-500 hover:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm"
                  id="select-all"
                />
                <span class="material-icons absolute opacity-0 peer-checked:opacity-100 pointer-events-none text-white text-[18px] font-black">check</span>
              </div>
            </th>
            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">성명</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">구분</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">소속</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">이메일</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">연락처</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">상태</th>
            <th v-if="mode === 'users'" class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">권한</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">가입일</th>
            <th class="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="user in users" :key="user.id" class="group transition-all hover:bg-slate-50/50">
            <td v-if="mode === USER_STATUS.PENDING" class="px-6 py-4.5 text-center">
              <div class="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  :value="user.id"
                  :checked="selectedUsers.includes(user.id)"
                  @change="updateSelection(user.id, $event.target.checked)"
                  class="peer h-6 w-6 cursor-pointer appearance-none rounded-xl border-2 border-slate-200 transition-all checked:border-primary-500 checked:bg-primary-500 hover:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm"
                  :id="'user-' + user.id"
                />
                <span class="material-icons absolute opacity-0 peer-checked:opacity-100 pointer-events-none text-white text-[18px] font-black">check</span>
              </div>
            </td>
            <td class="px-8 py-4.5 whitespace-nowrap">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-[16px] font-black text-white shadow-premium transition-all duration-500 group-hover:scale-105 group-hover:-translate-y-1 relative overflow-hidden" :class="getAvatarBgClass(user)">
                  <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  {{ getInitials(user.name) }}
                </div>
                <div>
                  <div v-if="user.name" class="font-bold text-slate-800 tracking-tight group-hover:text-primary-600 transition-colors text-[15px]">{{ user.name }}</div>
                  <div v-else class="text-sm italic text-slate-400">이름 없음</div>
                  <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">ID: {{ user.id.substring(0, 8) }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4.5 whitespace-nowrap">
              <span class="inline-flex items-center px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-sm border" :class="getAffiliationBadgeClass(user.affiliationType || user.organizationType)">
                {{ getAffiliationTypeLabel(user.affiliationType || user.organizationType) }}
              </span>
            </td>
            <td class="px-6 py-4.5 text-[14px] font-bold text-slate-600">{{ user.affiliation || user.organization || '-' }}</td>
            <td class="px-6 py-4.5 text-[14px] font-medium text-slate-500">{{ user.email || '-' }}</td>
            <td class="px-6 py-4.5 text-[14px] font-bold text-slate-600 whitespace-nowrap font-mono tracking-tighter">{{ user.phone || '-' }}</td>
            <td class="px-6 py-4.5 whitespace-nowrap">
              <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black transition-all shadow-sm group-hover:shadow-md" :class="getStatusBadgeClass(user.status || (user.approved ? 'approved' : 'pending'))">
                <span class="w-2 h-2 rounded-full shadow-sm" :class="getStatusDotClass(user.status || (user.approved ? 'approved' : 'pending'))"></span>
                {{ getStatusLabel(user.status || (user.approved ? 'approved' : 'pending')) }}
              </span>
            </td>
            <td v-if="mode === 'users'" class="px-6 py-4.5 whitespace-nowrap">
              <div v-if="currentUser && currentUser.role === USER_ROLES.ADMIN && user.id !== currentUser.id" class="relative group/select">
                <select 
                  v-model="user.role" 
                  @change="emit('change-role', user)"
                  class="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-black rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all cursor-pointer shadow-sm hover:border-slate-300"
                >
                  <option :value="USER_ROLES.ADMIN">시스템 관리자</option>
                  <option :value="USER_ROLES.SUPPORT">기술 지원 팀</option>
                  <option :value="USER_ROLES.USER">일반 사용자</option>
                </select>
                <span class="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm group-hover/select:text-primary-500 transition-colors">expand_more</span>
              </div>
              <span v-else class="text-[10px] font-black text-slate-500 bg-slate-100 px-3.5 py-2 rounded-xl uppercase tracking-wider inline-block">
                {{ getUserRoleLabel(user.role) }}
              </span>
            </td>
            <td class="px-6 py-4.5 text-[12px] font-bold text-slate-500 whitespace-nowrap font-mono">{{ formatDate(user.createdAt) }}</td>
            <td class="px-8 py-4.5 whitespace-nowrap text-center">
              <div v-if="mode === USER_STATUS.PENDING" class="flex items-center justify-center gap-3">
                <button @click="emit('approve', user.id)" class="w-11 h-11 flex items-center justify-center bg-white text-emerald-600 border border-emerald-100 rounded-2xl transition-all duration-300 hover:bg-emerald-500 hover:text-white hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-1 active:scale-95 shadow-sm group/btn" title="Approve">
                  <span class="material-icons text-2xl transition-transform group-hover/btn:rotate-12">check_circle</span>
                </button>
                <button @click="emit('reject', user.id)" class="w-11 h-11 flex items-center justify-center bg-white text-amber-600 border border-amber-100 rounded-2xl transition-all duration-300 hover:bg-amber-500 hover:text-white hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-1 active:scale-95 shadow-sm group/btn" title="Reject">
                  <span class="material-icons text-2xl transition-transform group-hover/btn:-rotate-12">cancel</span>
                </button>
              </div>
              <div v-else-if="mode === 'users'" class="flex items-center justify-center gap-2.5">
                <button 
                  v-if="user.id !== currentUser?.id && user.role !== USER_ROLES.ADMIN"
                  @click="emit('delete', user.id)" 
                  class="w-11 h-11 flex items-center justify-center bg-white text-red-500 border border-red-100 rounded-2xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-1 active:scale-95 shadow-sm group/btn" 
                  title="삭제"
                >
                  <span class="material-icons text-2xl transition-transform group-hover/btn:rotate-12">delete_forever</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue';
import { 
  getAffiliationTypeLabel, 
  formatDate,
  getStatusLabel
} from './utils.js';
import { AFFILIATION_TYPES, USER_ROLES, USER_ROLE_LABELS, USER_STATUS } from '../../constants';

// Props definition
const props = defineProps({
  users: {
    type: Array,
    required: true
  },
  mode: {
    type: String,
    required: true
  },
  selectedUsers: {
    type: Array,
    default: () => []
  },
  currentUser: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits symbol definition
const emit = defineEmits(['update:selectedUsers', 'approve', 'reject', 'delete', 'change-role']);

// Computeds
const isAllSelected = computed(() => {
  return props.users.length > 0 && 
         props.users.every(user => props.selectedUsers.includes(user.id));
});

// Selection helpers
function toggleSelectAll(event) {
  if (event.target.checked) {
    const allIds = props.users.map(user => user.id);
    emit('update:selectedUsers', allIds);
  } else {
    emit('update:selectedUsers', []);
  }
}

function updateSelection(userId, checked) {
  let newSelection = [...props.selectedUsers];
  if (checked) {
    if (!newSelection.includes(userId)) {
      newSelection.push(userId);
    }
  } else {
    newSelection = newSelection.filter(id => id !== userId);
  }
  emit('update:selectedUsers', newSelection);
}

// Visual helpers
function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function getAvatarBgClass(user) {
  const type = user.affiliationType || user.organizationType || AFFILIATION_TYPES.OTHER;
  switch (type) {
  case 'hospital': return 'bg-gradient-to-br from-blue-500 to-blue-600';
  case 'clinic': return 'bg-gradient-to-br from-violet-500 to-violet-600';
  case 'public_health': return 'bg-gradient-to-br from-emerald-500 to-emerald-600';
  case 'university': return 'bg-gradient-to-br from-amber-500 to-amber-600';
  case 'research': return 'bg-gradient-to-br from-pink-500 to-pink-600';
  case 'government': return 'bg-gradient-to-br from-cyan-500 to-cyan-600';
  default: return 'bg-gradient-to-br from-slate-500 to-slate-600';
  }
}

function getAffiliationBadgeClass(type) {
  switch (type) {
  case 'hospital': return 'bg-blue-50 text-blue-600';
  case 'clinic': return 'bg-violet-50 text-violet-600';
  case 'public_health': return 'bg-emerald-50 text-emerald-600';
  case 'university': return 'bg-amber-50 text-amber-600';
  case 'research': return 'bg-pink-50 text-pink-600';
  case 'government': return 'bg-cyan-50 text-cyan-600';
  default: return 'bg-slate-50 text-slate-600';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
  case 'approved': return 'bg-emerald-50 text-emerald-700';
  case 'pending': return 'bg-amber-50 text-amber-700';
  case 'rejected': return 'bg-red-50 text-red-700';
  case 'suspended': return 'bg-slate-50 text-slate-600';
  default: return 'bg-slate-50 text-slate-600';
  }
}

function getStatusDotClass(status) {
  switch (status) {
  case 'approved': return 'bg-emerald-500';
  case 'pending': return 'bg-amber-500 animate-pulse';
  case 'rejected': return 'bg-red-500';
  case 'suspended': return 'bg-slate-400';
  default: return 'bg-slate-400';
  }
}

function getUserRoleLabel(role) {
  return USER_ROLE_LABELS[role] || '알 수 없음';
}
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
