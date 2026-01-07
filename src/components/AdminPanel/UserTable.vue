<template>
  <div class="user-table-wrapper">
    <!-- Loading State -->
    <div v-if="loading" class="state-container loading-state">
      <div class="loading-spinner">
        <span class="material-icons spin">sync</span>
      </div>
      <h3>데이터를 불러오는 중...</h3>
      <p>잠시만 기다려주세요</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="users.length === 0" class="state-container empty-state">
      <div class="empty-icon-box" :class="mode">
        <span class="material-icons">{{ mode === 'pending' ? 'check_circle' : 'group_off' }}</span>
      </div>
      <h3>{{ mode === 'pending' ? '승인 대기 중인 사용자가 없습니다' : '등록된 사용자가 없습니다' }}</h3>
      <p>{{ mode === 'pending' ? '모든 사용자가 승인되었거나 아직 가입 신청이 없습니다.' : '아직 등록된 사용자가 없습니다.' }}</p>
    </div>

    <!-- Table -->
    <table v-else class="modern-table">
      <thead>
        <tr>
          <th v-if="mode === 'pending'" class="checkbox-col">
            <div class="checkbox-wrapper">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="modern-checkbox"
                id="select-all"
              />
              <label for="select-all" class="checkbox-label"></label>
            </div>
          </th>
          <th>이름</th>
          <th>소속유형</th>
          <th>소속</th>
          <th>이메일</th>
          <th>전화번호</th>
          <th>상태</th>
          <th v-if="mode === 'users'">권한</th>
          <th>가입일</th>
          <th class="actions-col">작업</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id" class="table-row">
          <td v-if="mode === 'pending'" class="checkbox-col">
            <div class="checkbox-wrapper">
              <input 
                type="checkbox" 
                :value="user.id"
                :checked="selectedUsers.includes(user.id)"
                @change="updateSelection(user.id, $event.target.checked)"
                class="modern-checkbox"
                :id="'user-' + user.id"
              />
              <label :for="'user-' + user.id" class="checkbox-label"></label>
            </div>
          </td>
          <td class="name-cell">
            <div class="user-info">
              <div class="user-avatar" :class="getAvatarClass(user)">
                {{ getInitials(user.name) }}
              </div>
              <span v-if="user.name" class="user-name">{{ user.name }}</span>
              <span v-else class="no-name">이름 없음</span>
            </div>
          </td>
          <td>
            <span class="affiliation-badge" :class="getAffiliationTypeClass(user.affiliationType || user.organizationType)">
              {{ getAffiliationTypeLabel(user.affiliationType || user.organizationType) }}
            </span>
          </td>
          <td class="org-cell">{{ user.affiliation || user.organization || '-' }}</td>
          <td class="email-cell">{{ user.email || '-' }}</td>
          <td class="phone-cell">{{ user.phone || '-' }}</td>
          <td>
            <span :class="['status-badge', getStatusClass(user.status || (user.approved ? 'approved' : 'pending'))]">
              <span class="status-dot"></span>
              {{ getStatusLabel(user.status || (user.approved ? 'approved' : 'pending')) }}
            </span>
          </td>
          <td v-if="mode === 'users'" class="role-cell">
            <select 
              v-if="currentUser && currentUser.role === 'admin' && user.id !== currentUser.id"
              v-model="user.role" 
              @change="$emit('change-role', user)"
              class="role-select"
            >
              <option value="admin">시스템 관리자</option>
              <option value="support">지원단</option>
              <option value="user">일반</option>
            </select>
            <span v-else class="role-text">
              {{ user.role === 'admin' ? '시스템 관리자' : user.role === 'support' ? '지원단' : '일반' }}
            </span>
          </td>
          <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
          <td class="actions-cell">
            <div v-if="mode === 'pending'" class="action-buttons">
              <button @click="$emit('approve', user.id)" class="action-btn approve" title="승인">
                <span class="material-icons">check</span>
              </button>
              <button @click="$emit('reject', user.id)" class="action-btn reject" title="거부">
                <span class="material-icons">close</span>
              </button>
            </div>
            <div v-else-if="mode === 'users'" class="action-buttons">
              <button 
                v-if="user.id !== currentUser?.id && user.role !== 'admin'"
                @click="$emit('delete', user.id)" 
                class="action-btn delete" 
                title="삭제"
              >
                <span class="material-icons">delete_outline</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { 
  getAffiliationTypeLabel, 
  getAffiliationTypeClass, 
  getStatusClass, 
  getStatusLabel, 
  formatDate 
} from './utils.js';

export default {
  name: 'UserTable',
  props: {
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
  },
  computed: {
    isAllSelected() {
      return this.users.length > 0 && 
             this.users.every(user => this.selectedUsers.includes(user.id));
    }
  },
  methods: {
    getAffiliationTypeLabel,
    getAffiliationTypeClass,
    getStatusClass,
    getStatusLabel,
    formatDate,
    
    toggleSelectAll(event) {
      if (event.target.checked) {
        const allIds = this.users.map(user => user.id);
        this.$emit('update:selectedUsers', allIds);
      } else {
        this.$emit('update:selectedUsers', []);
      }
    },
    
    updateSelection(userId, checked) {
      let newSelection = [...this.selectedUsers];
      if (checked) {
        if (!newSelection.includes(userId)) {
          newSelection.push(userId);
        }
      } else {
        newSelection = newSelection.filter(id => id !== userId);
      }
      this.$emit('update:selectedUsers', newSelection);
    },

    getInitials(name) {
      if (!name) return '?';
      return name.charAt(0).toUpperCase();
    },

    getAvatarClass(user) {
      const types = ['hospital', 'clinic', 'public_health', 'university', 'research', 'government', 'other'];
      const type = user.affiliationType || user.organizationType || 'other';
      return types.includes(type) ? type : 'other';
    }
  }
};
</script>

<style scoped>
.user-table-wrapper {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* Modern Table */
.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 16px 20px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.modern-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #334155;
  vertical-align: middle;
}

.table-row {
  transition: all 0.2s ease;
}

.table-row:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #fafbfc 100%);
}

.table-row:last-child td {
  border-bottom: none;
}

/* Checkbox Styling */
.checkbox-col {
  width: 48px;
  text-align: center;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modern-checkbox {
  display: none;
}

.checkbox-label {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.checkbox-label:hover {
  border-color: #3b82f6;
}

.modern-checkbox:checked + .checkbox-label {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #2563eb;
}

.modern-checkbox:checked + .checkbox-label::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 6px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* User Info with Avatar */
.name-cell {
  min-width: 160px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.user-avatar.hospital { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.user-avatar.clinic { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
.user-avatar.public_health { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.user-avatar.university { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.user-avatar.research { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
.user-avatar.government { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
.user-avatar.other { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }

.user-name {
  font-weight: 600;
  color: #1e293b;
}

.no-name {
  color: #94a3b8;
  font-style: italic;
  font-size: 13px;
}

/* Affiliation Badges */
.affiliation-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.affiliation-hospital { background: #dbeafe; color: #1d4ed8; }
.affiliation-clinic { background: #ede9fe; color: #6d28d9; }
.affiliation-public_health { background: #d1fae5; color: #047857; }
.affiliation-university { background: #fef3c7; color: #b45309; }
.affiliation-research { background: #fce7f3; color: #be185d; }
.affiliation-government { background: #ccfbf1; color: #0f766e; }
.affiliation-other { background: #f1f5f9; color: #475569; }

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.approved {
  background: #dcfce7;
  color: #166534;
}

.status-badge.approved .status-dot {
  background: #22c55e;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pending .status-dot {
  background: #f59e0b;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.rejected .status-dot {
  background: #ef4444;
}

.status-badge.suspended {
  background: #f1f5f9;
  color: #475569;
}

.status-badge.suspended .status-dot {
  background: #94a3b8;
}

/* Role Select */
.role-cell {
  min-width: 140px;
}

.role-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: white;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.role-text {
  color: #64748b;
  font-size: 13px;
}

/* Date Cell */
.date-cell {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

/* Actions */
.actions-col {
  width: 100px;
  text-align: center;
}

.actions-cell {
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn .material-icons {
  font-size: 18px;
}

.action-btn.approve {
  background: #dcfce7;
  color: #16a34a;
}

.action-btn.approve:hover {
  background: #16a34a;
  color: white;
  transform: scale(1.1);
}

.action-btn.reject {
  background: #fef3c7;
  color: #d97706;
}

.action-btn.reject:hover {
  background: #d97706;
  color: white;
  transform: scale(1.1);
}

.action-btn.delete {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn.delete:hover {
  background: #dc2626;
  color: white;
  transform: scale(1.1);
}

/* State Containers */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.state-container h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.state-container p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

/* Loading State */
.loading-spinner {
  margin-bottom: 20px;
}

.loading-spinner .material-icons {
  font-size: 48px;
  color: #3b82f6;
}

.material-icons.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-icon-box {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon-box .material-icons {
  font-size: 40px;
}

.empty-icon-box.pending {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #16a34a;
}

.empty-icon-box.users {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #64748b;
}

/* Responsive */
@media (max-width: 1024px) {
  .modern-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
