<template>
  <div class="flex flex-wrap justify-between items-center gap-6 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-5 shadow-sm shadow-slate-900/5">
    <!-- Filter Section -->
    <div class="flex flex-wrap items-end gap-4">
      <!-- Affiliation Type Filter -->
      <FilterDropdown
        label="소속 유형"
        :modelValue="filters.affiliationType"
        @update:modelValue="updateFilter('affiliationType', $event)"
        :options="affiliationTypeOptions"
      />

      <!-- Affiliation Filter -->
      <FilterDropdown
        v-if="availableOrganizations.length > 0"
        label="소속"
        :modelValue="filters.affiliation"
        @update:modelValue="updateFilter('affiliation', $event)"
        :options="availableOrganizations"
      />

      <!-- Today Filter Button -->
      <button 
        @click="$emit('filter-today')" 
        class="h-[42px] px-5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-300 border" 
        :class="filters.todayOnly 
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-transparent text-white shadow-lg shadow-blue-500/30' 
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300'"
        title="오늘 가입자만 보기"
      >
        <span class="material-icons text-xl">today</span>
        오늘
      </button>
    </div>

    <!-- Search Section -->
    <div class="flex-1 max-w-full md:max-w-md w-full order-first lg:order-none">
      <div class="relative flex items-center">
        <span class="material-icons absolute left-4 text-slate-400 pointer-events-none">search</span>
        <input 
          :value="searchQuery" 
          type="text" 
          placeholder="이름, 소속, 전화번호 등 검색" 
          class="w-full bg-slate-50 border border-slate-200 rounded-1.5xl px-11 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
        <button 
          v-if="searchQuery" 
          @click="$emit('clear-search')" 
          class="absolute right-3 w-7 h-7 flex items-center justify-center bg-slate-200 text-slate-500 rounded-lg transition-colors hover:bg-slate-300 hover:text-slate-700"
          title="검색어 지우기"
        >
          <span class="material-icons text-base">close</span>
        </button>
      </div>
    </div>

    <!-- Bulk Approve FAB -->
    <div class="flex items-center">
      <transition 
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 scale-90 translate-y-2"
        leave-to-class="opacity-0 scale-90 translate-y-2"
      >
        <button
          v-if="showBulkApprove"
          class="flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 shadow-xl shadow-emerald-500/30 enabled:bg-gradient-to-br enabled:from-emerald-500 enabled:to-emerald-600 enabled:text-white enabled:hover:-translate-y-1 enabled:hover:shadow-emerald-500/40 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          @click="$emit('bulk-approve')"
          :disabled="selectedCount === 0"
          :title="selectedCount > 0 ? `선택된 ${selectedCount}명 승인` : '승인할 사용자를 선택하세요'"
        >
          <span class="material-icons text-xl">done_all</span>
          <span>일괄 승인</span>
          <span v-if="selectedCount > 0" class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-white/20 text-xs font-bold">{{ selectedCount }}</span>
        </button>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import FilterDropdown from './FilterDropdown.vue';

const props = defineProps({
  filters: { type: Object, required: true },
  searchQuery: { type: String, default: '' },
  availableOrganizations: { type: Array, default: () => [] },
  showBulkApprove: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 }
});

const emit = defineEmits([
  'update:filters', 
  'update:searchQuery', 
  'filter-today', 
  'clear-search', 
  'bulk-approve'
]);

const affiliationTypeOptions = [
  { value: 'hospital', label: '병원' },
  { value: 'clinic', label: '의원' },
  { value: 'public_health', label: '보건소' },
  { value: 'university', label: '대학교' },
  { value: 'research', label: '연구기관' },
  { value: 'government', label: '정부기관' },
  { value: 'other', label: '기타' }
];

function updateFilter(key, value) {
  const newFilters = { ...props.filters, [key]: value };
  emit('update:filters', newFilters);
}
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
