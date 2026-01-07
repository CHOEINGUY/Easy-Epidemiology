<template>
  <div class="toolbar-glass">
    <!-- Filter Section -->
    <div class="toolbar-left">
      <!-- Affiliation Type Filter -->
      <div class="filter-group">
        <label class="filter-label">소속 유형</label>
        <div class="select-wrapper">
          <select 
            :value="filters.affiliationType" 
            @input="updateFilter('affiliationType', $event.target.value)" 
            class="filter-select"
          >
            <option value="">전체</option>
            <option value="hospital">병원</option>
            <option value="clinic">의원</option>
            <option value="public_health">보건소</option>
            <option value="university">대학교</option>
            <option value="research">연구기관</option>
            <option value="government">정부기관</option>
            <option value="other">기타</option>
          </select>
          <span class="select-arrow material-icons">expand_more</span>
        </div>
      </div>

      <!-- Affiliation Filter -->
      <div v-if="availableOrganizations.length > 0" class="filter-group">
        <label class="filter-label">소속</label>
        <div class="select-wrapper">
          <select 
            :value="filters.affiliation" 
            @input="updateFilter('affiliation', $event.target.value)" 
            class="filter-select"
          >
            <option value="">전체</option>
            <option v-for="org in availableOrganizations" :key="org" :value="org">
              {{ org }}
            </option>
          </select>
          <span class="select-arrow material-icons">expand_more</span>
        </div>
      </div>

      <!-- Today Filter Button -->
      <button 
        @click="$emit('filter-today')" 
        class="today-btn" 
        :class="{ active: filters.todayOnly }" 
        title="오늘 가입자만 보기"
      >
        <span class="material-icons">today</span>
        오늘
      </button>
    </div>

    <!-- Search Section -->
    <div class="toolbar-center">
      <div class="search-box">
        <span class="material-icons search-icon">search</span>
        <input 
          :value="searchQuery" 
          type="text" 
          placeholder="이름, 소속, 전화번호 등 검색" 
          class="search-input"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
        <button 
          v-if="searchQuery" 
          @click="$emit('clear-search')" 
          class="clear-search-btn"
          title="검색어 지우기"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>

    <!-- Bulk Approve FAB -->
    <div class="toolbar-right">
      <transition name="scale-fade">
        <button
          v-if="showBulkApprove"
          class="fab-approve-btn"
          @click="$emit('bulk-approve')"
          :disabled="selectedCount === 0"
          :title="selectedCount > 0 ? `선택된 ${selectedCount}명 승인` : '승인할 사용자를 선택하세요'"
        >
          <span class="material-icons">done_all</span>
          <span class="fab-label">일괄 승인</span>
          <span v-if="selectedCount > 0" class="fab-count">{{ selectedCount }}</span>
        </button>
      </transition>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminToolbar',
  props: {
    filters: {
      type: Object,
      required: true
    },
    searchQuery: {
      type: String,
      default: ''
    },
    availableOrganizations: {
      type: Array,
      default: () => []
    },
    showBulkApprove: {
      type: Boolean,
      default: false
    },
    selectedCount: {
      type: Number,
      default: 0
    }
  },
  methods: {
    updateFilter(key, value) {
      const newFilters = { ...this.filters, [key]: value };
      this.$emit('update:filters', newFilters);
    }
  }
};
</script>

<style scoped>
.toolbar-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

/* Left Section - Filters */
.toolbar-left {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  appearance: none;
  padding: 10px 40px 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  background: #f8fafc;
  color: #334155;
  min-width: 140px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: white;
}

.filter-select:hover {
  border-color: #cbd5e1;
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 20px;
  pointer-events: none;
}

.today-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  padding: 0 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.today-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.today-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.today-btn .material-icons {
  font-size: 18px;
}

/* Center Section - Search */
.toolbar-center {
  flex: 1;
  max-width: 400px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  font-size: 20px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 44px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: #f8fafc;
  color: #1e293b;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: white;
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
}

.clear-search-btn:hover {
  background: #cbd5e1;
  color: #334155;
}

.clear-search-btn .material-icons {
  font-size: 16px;
}

/* Right Section - FAB */
.toolbar-right {
  display: flex;
  align-items: center;
}

.fab-approve-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fab-approve-btn:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
}

.fab-approve-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.fab-approve-btn:active:not(:disabled) {
  transform: translateY(0);
}

.fab-approve-btn .material-icons {
  font-size: 20px;
}

.fab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}

/* Scale Fade Animation */
.scale-fade-enter-active {
  animation: scaleFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-fade-leave-active {
  animation: scaleFadeOut 0.2s ease-in forwards;
}

@keyframes scaleFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .toolbar-glass {
    flex-wrap: wrap;
    gap: 16px;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .toolbar-center {
    order: -1;
    flex: 0 0 100%;
    max-width: none;
  }
}

@media (max-width: 640px) {
  .toolbar-glass {
    padding: 16px;
  }

  .filter-group {
    flex: 1;
  }

  .filter-select {
    width: 100%;
    min-width: 0;
  }

  .fab-approve-btn {
    width: 100%;
    justify-content: center;
  }

  .toolbar-right {
    flex: 0 0 100%;
  }
}
</style>
