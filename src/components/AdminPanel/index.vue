<template>
  <div class="admin-panel">
    <!-- Animated Background -->
    <div class="admin-bg">
      <div class="bg-grid"></div>
      <div class="bg-gradient"></div>
    </div>

    <!-- Fixed Header (Hero Style) -->
    <header class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">관리자 패널</h1>
        </div>
        <button @click="logout" class="logout-btn">
          <span class="material-icons">logout</span>
          로그아웃
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="admin-content">
      <!-- Statistics Dashboard -->
      <AdminStats :stats="stats" />

      <!-- Tab Navigation (Pill Style) -->
      <div class="tab-nav-bar">
        <div class="tab-buttons">
          <button 
            @click="activeTab = 'pending'" 
            :class="{ active: activeTab === 'pending' }"
            class="tab-btn"
          >
            <span class="material-icons">hourglass_empty</span>
            <span class="tab-label">승인 대기</span>
            <span class="tab-count">{{ pendingUsers.length }}</span>
          </button>
          <button 
            @click="activeTab = 'users'" 
            :class="{ active: activeTab === 'users' }"
            class="tab-btn"
          >
            <span class="material-icons">group</span>
            <span class="tab-label">전체 사용자</span>
            <span class="tab-count">{{ allUsers.length }}</span>
          </button>
          <button 
            @click="activeTab = 'settings'" 
            :class="{ active: activeTab === 'settings' }"
            class="tab-btn"
          >
            <span class="material-icons">settings</span>
            <span class="tab-label">사이트 설정</span>
          </button>
        </div>
        <button @click="refreshData" class="refresh-btn" title="새로고침">
          <span class="material-icons">refresh</span>
        </button>
      </div>

      <!-- Toolbar (Filters & Search) - Only visible for user lists -->
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

      <!-- Content Area -->
      <div class="content-area">
        <!-- Site Settings -->
        <SiteSettings
          v-if="activeTab === 'settings'"
          :config="siteConfig"
          @update:config="siteConfig = $event"
          @save="saveSettings"
          @reset="resetSettings"
        />

        <!-- User Table -->
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
    </div>

    <!-- Notification (Modern Toast) -->
    <transition name="toast">
      <div v-if="message" :class="['notification', messageType]" @click="clearMessage">
        <div class="notification-icon">
          <span class="material-icons">
            {{ messageType === 'success' ? 'check_circle' : messageType === 'error' ? 'cancel' : 'info' }}
          </span>
        </div>
        <span class="notification-text">{{ message }}</span>
        <button class="notification-close">
          <span class="material-icons">close</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
// Adjusted imports for new folder structure
import { adminApi, userManager } from '../../services/authApi.js';
import { loadSiteConfig, updateSiteConfig, resetSiteConfig, siteConfig as defaultConfig } from '../../config/siteConfig.js';

import AdminStats from './AdminStats.vue';
import AdminToolbar from './AdminToolbar.vue';
import UserTable from './UserTable.vue';
import SiteSettings from './SiteSettings.vue';
import { getAffiliationTypeLabel } from './utils.js';

export default {
  name: 'AdminPanel',
  components: {
    AdminStats,
    AdminToolbar,
    UserTable,
    SiteSettings
  },
  data() {
    return {
      activeTab: 'pending',
      pendingUsers: [],
      allUsers: [],
      loading: false,
      message: '',
      messageType: 'info',
      selectedUsers: [],
      searchQuery: '',
      searchTimeout: null,
      siteConfig: loadSiteConfig(),
      filters: {
        affiliationType: '',
        affiliation: '',
        province: '',
        district: '',
        todayOnly: false
      }
    };
  },
  computed: {
    currentUser() {
      return userManager.getUser();
    },
    stats() {
      return {
        total: this.allUsers.length,
        pending: this.pendingUsers.length,
        approved: this.allUsers.filter(user => user.approved).length,
        admin: this.allUsers.filter(user => user.role === 'admin').length
      };
    },
    selectedCount() {
      return this.selectedUsers.length;
    },
    filteredPendingUsers() {
      return this.filterUsers(this.pendingUsers);
    },
    filteredAllUsers() {
      return this.filterUsers(this.allUsers);
    },
    availableOrganizations() {
      const orgSet = new Set();
      const users = [...this.pendingUsers, ...this.allUsers];
      users.forEach(user => {
        if (
          (!this.filters.affiliationType || user.affiliationType === this.filters.affiliationType) &&
          user.affiliation
        ) {
          orgSet.add(user.affiliation);
        }
      });
      return Array.from(orgSet).sort();
    }
  },
  watch: {
    activeTab() {
      this.loadData();
      this.selectedUsers = [];
    }
  },
  mounted() {
    this.loadAllUsers();
    this.loadData();
  },
  methods: {
    filterUsers(users) {
      let filtered = users;
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase().trim();
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
      
      if (this.filters.affiliationType) {
        filtered = filtered.filter(user => 
          user.affiliationType === this.filters.affiliationType
        );
      }

      if (this.filters.affiliation) {
        filtered = filtered.filter(user => user.affiliation === this.filters.affiliation);
      }
      
      if (this.filters.todayOnly) {
        const today = new Date().toDateString();
        filtered = filtered.filter(user => {
          const userDate = new Date(user.createdAt).toDateString();
          return userDate === today;
        });
      }
      
      return filtered;
    },

    async loadData() {
      this.loading = true;
      try {
        if (this.activeTab === 'pending') {
          await this.loadPendingUsers();
        } else {
          await this.loadAllUsers();
        }
      } catch (error) {
        this.showMessage(error.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadPendingUsers() {
      const result = await adminApi.getPendingUsers();
      if (result.data && result.data.users) {
        this.pendingUsers = result.data.users;
      } else if (result.users) {
        this.pendingUsers = result.users;
      } else if (result.data) {
        this.pendingUsers = Array.isArray(result.data) ? result.data : [result.data];
      } else {
        this.pendingUsers = [];
      }
    },

    async loadAllUsers() {
      const result = await adminApi.getAllUsers();
      if (result.data && result.data.users) {
        this.allUsers = result.data.users;
      } else if (result.users) {
        this.allUsers = result.users;
      } else if (result.data) {
        this.allUsers = Array.isArray(result.data) ? result.data : [result.data];
      } else {
        this.allUsers = [];
      }
    },

    async refreshData() {
      if (this.activeTab === 'pending') {
        await this.loadPendingUsers();
        this.showMessage('승인 대기 사용자 목록이 새로고침되었습니다.', 'success');
      } else {
        await this.loadAllUsers();
        this.showMessage('전체 사용자 목록이 새로고침되었습니다.', 'success');
      }
    },

    filterToday() {
      this.filters.todayOnly = !this.filters.todayOnly;
      if (this.filters.todayOnly) {
        this.showMessage('오늘 가입한 사용자만 표시됩니다.', 'info');
      } else {
        this.showMessage('모든 사용자가 표시됩니다.', 'info');
      }
    },

    clearSearch() {
      this.searchQuery = '';
    },

    async approveUser(userId) {
      try {
        await adminApi.approveUser(userId);
        this.showMessage('사용자가 승인되었습니다.', 'success');
        await this.loadPendingUsers();
        await this.loadAllUsers();
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    },

    async rejectUser(userId) {
      if (!confirm('정말로 이 사용자의 등록을 거부하시겠습니까?')) {
        return;
      }
      try {
        await adminApi.rejectUser(userId);
        this.showMessage('사용자 등록이 거부되었습니다.', 'success');
        await this.loadPendingUsers();
        await this.loadAllUsers();
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    },

    async deleteUser(userId) {
      if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        return;
      }
      try {
        await adminApi.deleteUser(userId);
        this.showMessage('사용자가 삭제되었습니다.', 'success');
        await this.loadAllUsers();
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    },

    async changeUserRole(user) {
      try {
        await adminApi.updateUserRole(user.id, user.role);
        this.showMessage('사용자 권한이 변경되었습니다.', 'success');
      } catch (error) {
        this.showMessage(error.message, 'error');
        await this.loadAllUsers();
      }
    },

    async bulkApprove() {
      if (this.selectedCount === 0) return;
      if (!confirm(`선택된 ${this.selectedCount}명의 사용자를 승인하시겠습니까?`)) return;

      try {
        await adminApi.bulkApproveUsers(this.selectedUsers);
        this.showMessage(`${this.selectedCount}명의 사용자가 승인되었습니다.`, 'success');
        await this.loadPendingUsers();
        await this.loadAllUsers();
        this.selectedUsers = [];
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    },

    logout() {
      if (confirm('정말로 로그아웃하시겠습니까?')) {
        this.$store.dispatch('auth/logout').then(() => {
          this.$emit('logout');
        }).catch(() => {
          this.$emit('logout');
        });
      }
    },

    saveSettings() {
      try {
        updateSiteConfig(this.siteConfig);
        this.showMessage('설정이 성공적으로 저장되었습니다.', 'success');
      } catch (error) {
        this.showMessage(`설정 저장에 실패했습니다: ${error.message}`, 'error');
      }
    },

    resetSettings() {
      if (confirm('정말로 기본값으로 복원하시겠습니까? 현재 설정이 모두 사라집니다.')) {
        try {
          resetSiteConfig();
          this.siteConfig = JSON.parse(JSON.stringify(defaultConfig));
          this.showMessage('설정이 기본값으로 복원되었습니다.', 'success');
        } catch (error) {
          this.showMessage(`설정 복원에 실패했습니다: ${error.message}`, 'error');
        }
      }
    },

    showMessage(message, type = 'info') {
      this.message = message;
      this.messageType = type;
      setTimeout(() => {
        this.message = '';
      }, 3000);
    },

    clearMessage() {
      this.message = '';
    }
  }
};
</script>

<style scoped>
.admin-panel {
  position: relative;
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
}

/* Animated Background */
.admin-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
}

.bg-gradient {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.04), transparent 50%);
  animation: pulse 15s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.2); opacity: 0.8; }
}

/* Header (Hero Style) */
.admin-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.2);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}



.header-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
  letter-spacing: -0.02em;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.logout-btn .material-icons {
  font-size: 18px;
}

/* Main Content */
.admin-content {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
}

/* Tab Navigation (Pill Style) */
.tab-nav-bar {
  background: white;
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
}

.tab-buttons {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.tab-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.tab-btn .material-icons {
  font-size: 20px;
}

.tab-label {
  font-weight: 600;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}

.tab-btn.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #64748b;
}

.refresh-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
  transform: rotate(180deg);
}

.refresh-btn .material-icons {
  font-size: 20px;
}

/* Content Area */
.content-area {
  margin-top: 8px;
}

/* Notification (Modern Toast) */
.notification {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  z-index: 1000;
  max-width: 400px;
  border: 1px solid #e2e8f0;
}

.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification.success .notification-icon {
  background: #dcfce7;
  color: #16a34a;
}

.notification.error .notification-icon {
  background: #fee2e2;
  color: #dc2626;
}

.notification.info .notification-icon {
  background: #dbeafe;
  color: #2563eb;
}

.notification-text {
  flex: 1;
  color: #1e293b;
}

.notification-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.notification-close:hover {
  background: #e2e8f0;
  color: #334155;
}

.notification-close .material-icons {
  font-size: 16px;
}

/* Toast Animation */
.toast-enter-active {
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  animation: slideOut 0.3s ease-in forwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100px);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 16px 20px;
  }

  .admin-content {
    padding: 16px;
  }

  .tab-nav-bar {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .tab-buttons {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tab-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }

  .notification {
    left: 16px;
    right: 16px;
    bottom: 16px;
    max-width: none;
  }
}
</style>
