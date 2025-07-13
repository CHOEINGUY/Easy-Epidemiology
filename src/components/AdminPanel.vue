<template>
  <div class="admin-panel">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    
    <!-- Fixed Header -->
    <div class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">관리자 패널</h1>
        </div>
        <button @click="logout" class="logout-btn">
          <span class="material-icons">logout</span>
          로그아웃
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="admin-content">
      <!-- Tab and Filter Bar -->
      <div class="tab-filter-bar">
        <div class="tab-buttons">
          <button 
            @click="activeTab = 'pending'" 
            :class="{ active: activeTab === 'pending' }"
            class="tab-btn"
          >
            <span class="material-icons">hourglass_empty</span>
            승인 대기 ({{ pendingUsers.length }})
          </button>
          <button 
            @click="activeTab = 'users'" 
            :class="{ active: activeTab === 'users' }"
            class="tab-btn"
          >
            <span class="material-icons">group</span>
            전체 사용자 ({{ allUsers.length }})
          </button>
        </div>
        <button @click="refreshData" class="refresh-btn">
          <span class="material-icons">refresh</span>
        </button>
      </div>

      <!-- Filter Section -->
      <div class="filter-section">
        <div class="filter-row custom-filter-row">
          <!-- 왼쪽: 필터 3개 -->
          <div class="filter-group">
            <label>소속 유형</label>
            <select v-model="filters.organizationType" class="filter-select">
              <option value="">전체</option>
              <option value="보건소">보건소</option>
              <option value="지원단">지원단</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div class="filter-group">
            <label>시/도</label>
            <select v-model="filters.province" class="filter-select" @change="filters.district = ''">
              <option value="">전체</option>
              <option v-for="province in availableProvinces" :key="province" :value="province">
                {{ province }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>시/군/구</label>
            <select v-model="filters.district" class="filter-select">
              <option value="">전체</option>
              <option v-for="district in availableDistrictsForFilter" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <!-- 오른쪽: 오늘+검색+일괄버튼 -->
          <div class="filter-actions">
            <button @click="filterToday" class="today-btn tab-btn" :class="{ active: filters.todayOnly }" title="오늘 가입자만 보기">
              오늘
            </button>
            <div class="search-box">
              <span class="material-icons search-icon">search</span>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="검색" 
                class="search-input"
                @input="onSearchInput"
              />
              <button 
                v-if="searchQuery" 
                @click="clearSearch" 
                class="clear-search-btn"
                title="검색어 지우기"
              >
                <span class="material-icons">close</span>
              </button>
            </div>
            <div v-if="activeTab === 'pending' && filteredPendingUsers.length > 0" class="bulk-actions-inline">
              <label class="select-all-label">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="select-all-checkbox"
                />
                전체 선택 ({{ selectedCount }}/{{ filteredPendingUsers.length }})
              </label>
              <button 
                @click="bulkApprove" 
                :disabled="selectedCount === 0"
                class="bulk-btn approve"
              >
                <span class="material-icons">check_circle</span>
                일괄 승인 ({{ selectedCount }})
              </button>
              <button 
                @click="bulkReject" 
                :disabled="selectedCount === 0"
                class="bulk-btn reject"
              >
                <span class="material-icons">cancel</span>
                일괄 거부 ({{ selectedCount }})
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-area">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner">
            <span class="material-icons spin">autorenew</span>
          </div>
          <p>데이터를 불러오는 중...</p>
        </div>
        
        <div v-else-if="activeTab === 'pending' && filteredPendingUsers.length === 0" class="empty-state">
          <span class="material-icons">check_circle</span>
          <h3>승인 대기 중인 사용자가 없습니다</h3>
          <p>모든 사용자가 승인되었습니다.</p>
        </div>

        <div v-else-if="activeTab === 'users' && filteredAllUsers.length === 0" class="empty-state">
          <span class="material-icons">group_off</span>
          <h3>등록된 사용자가 없습니다</h3>
          <p>아직 등록된 사용자가 없습니다.</p>
        </div>

        <div v-else class="user-table">
          <table>
            <thead>
              <tr>
                <th v-if="activeTab === 'pending'" class="checkbox-col">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="select-all-checkbox"
                  />
                </th>
                <th>이름</th>
                <th>아이디</th>
                <th>소속</th>
                <th>연락처</th>
                <th>상태</th>
                <th v-if="activeTab === 'users'">권한</th>
                <th>가입일</th>
                <th class="actions-col">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in (activeTab === 'pending' ? filteredPendingUsers : filteredAllUsers)" :key="user.id">
                <td v-if="activeTab === 'pending'" class="checkbox-col">
                  <input 
                    type="checkbox" 
                    :value="user.id"
                    v-model="selectedUsers"
                    class="user-select-checkbox"
                  />
                </td>
                <td>{{ user.name }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.organization }}</td>
                <td>{{ user.phone || '-' }}</td>
                <td>
                  <span :class="['status-badge', user.approved ? 'approved' : 'pending']">
                    {{ user.approved ? '승인됨' : '승인 대기' }}
                  </span>
                </td>
                <td v-if="activeTab === 'users'">
                  <select 
                    v-if="currentUser && currentUser.role === 'admin' && user.id !== currentUser.id"
                    v-model="user.role" 
                    @change="changeUserRole(user)"
                    class="role-select"
                  >
                    <option value="admin">시스템 관리자</option>
                    <option value="support">지원단</option>
                    <option value="user">일반</option>
                  </select>
                  <span v-else>
                    {{ user.role === 'admin' ? '시스템 관리자' : user.role === 'support' ? '지원단' : '일반' }}
                  </span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td class="actions-cell">
                  <div v-if="activeTab === 'pending'" class="action-buttons">
                    <button @click="approveUser(user.id)" class="action-btn approve" title="승인">
                      <span class="material-icons">check_circle</span>
                    </button>
                    <button @click="rejectUser(user.id)" class="action-btn reject" title="거부">
                      <span class="material-icons">cancel</span>
                    </button>
                  </div>
                  <div v-else-if="activeTab === 'users'" class="action-buttons">
                    <button 
                      v-if="user.id !== currentUser?.id && user.role !== 'admin'"
                      @click="deleteUser(user.id)" 
                      class="action-btn delete" 
                      title="삭제"
                    >
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Notification -->
    <div v-if="message" :class="['notification', messageType]" @click="clearMessage">
      <span class="material-icons">
        {{ messageType === 'success' ? 'check_circle' : messageType === 'error' ? 'cancel' : 'info' }}
      </span>
      {{ message }}
    </div>
  </div>
</template>

<script>
import { adminApi, userManager } from '../services/authApi.js';

export default {
  name: 'AdminPanel',
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
      filters: {
        organizationType: '',
        province: '',
        district: '',
        todayOnly: false
      },
      provinces: [
        '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
        '세종특별자치시', '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
      ],
      districts: {
        '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
        '부산광역시': ['강서구', '금정구', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구', '기장군'],
        '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
        '인천광역시': ['계양구', '남구', '남동구', '동구', '부평구', '서구', '연수구', '중구', '강화군', '옹진군'],
        '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
        '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
        '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
        '세종특별자치시': ['세종특별자치시'],
        '경기도': ['수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시', '동두천시', '안산시', '고양시', '과천시', '구리시', '남양주시', '오산시', '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시', '광주시', '여주시', '양평군', '고양군', '연천군', '포천군', '가평군'],
        '강원도': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
        '충청북도': ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
        '충청남도': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
        '전라북도': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
        '전라남도': ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
        '경상북도': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '군위군', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
        '경상남도': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
        '제주특별자치도': ['제주시', '서귀포시']
      }
    };
  },
  computed: {
    currentUser() {
      return userManager.getUser();
    },
    approvedUsers() {
      return this.allUsers.filter(user => user.approved);
    },
    adminUsers() {
      return this.allUsers.filter(user => user.role === 'admin');
    },
    filteredPendingUsers() {
      let filtered = this.pendingUsers;
      
      // 검색 필터 적용
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(user => {
          return (
            (user.name && user.name.toLowerCase().includes(query)) ||
            (user.username && user.username.toLowerCase().includes(query)) ||
            (user.organization && user.organization.toLowerCase().includes(query)) ||
            (user.phone && user.phone.includes(query)) ||
            (user.email && user.email.toLowerCase().includes(query))
          );
        });
      }
      
      if (this.filters.organizationType) {
        filtered = filtered.filter(user => 
          user.organizationType === this.filters.organizationType
        );
      }
      
      if (this.filters.province) {
        filtered = filtered.filter(user => 
          user.province === this.filters.province
        );
      }
      
      if (this.filters.district) {
        filtered = filtered.filter(user => 
          user.district === this.filters.district
        );
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
    filteredAllUsers() {
      let filtered = this.allUsers;
      
      // 검색 필터 적용
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(user => {
          return (
            (user.name && user.name.toLowerCase().includes(query)) ||
            (user.username && user.username.toLowerCase().includes(query)) ||
            (user.organization && user.organization.toLowerCase().includes(query)) ||
            (user.phone && user.phone.includes(query)) ||
            (user.email && user.email.toLowerCase().includes(query))
          );
        });
      }
      
      if (this.filters.organizationType) {
        filtered = filtered.filter(user => 
          user.organizationType === this.filters.organizationType
        );
      }
      
      if (this.filters.province) {
        filtered = filtered.filter(user => 
          user.province === this.filters.province
        );
      }
      
      if (this.filters.district) {
        filtered = filtered.filter(user => 
          user.district === this.filters.district
        );
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
    selectedCount() {
      return this.selectedUsers.length;
    },
    isAllSelected() {
      return this.filteredPendingUsers.length > 0 && 
             this.selectedUsers.length === this.filteredPendingUsers.length;
    },
    availableDistricts() {
      return this.districts[this.filters.province] || [];
    },
    availableProvinces() {
      // 실제 사용자가 있는 시/도만 반환
      const provinces = new Set();
      
      // 승인 대기 사용자에서
      this.pendingUsers.forEach(user => {
        if (user.province) {
          provinces.add(user.province);
        }
      });
      
      // 전체 사용자에서
      this.allUsers.forEach(user => {
        if (user.province) {
          provinces.add(user.province);
        }
      });
      
      return Array.from(provinces).sort();
    },
    availableDistrictsForFilter() {
      // 선택된 시/도에서 실제 사용자가 있는 시/군/구만 반환
      if (!this.filters.province) return [];
      
      const districts = new Set();
      
      // 승인 대기 사용자에서
      this.pendingUsers.forEach(user => {
        if (user.province === this.filters.province && user.district) {
          districts.add(user.district);
        }
      });
      
      // 전체 사용자에서
      this.allUsers.forEach(user => {
        if (user.province === this.filters.province && user.district) {
          districts.add(user.district);
        }
      });
      
      return Array.from(districts).sort();
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
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
      this.pendingUsers = result.data.users;
    },

    async loadAllUsers() {
      const result = await adminApi.getAllUsers();
      this.allUsers = result.data.users;
    },

    async refreshData() {
      if (this.activeTab === 'pending') {
        await this.refreshPendingUsers();
      } else {
        await this.refreshAllUsers();
      }
    },

    async refreshPendingUsers() {
      await this.loadPendingUsers();
      this.showMessage('승인 대기 사용자 목록이 새로고침되었습니다.', 'success');
    },

    async refreshAllUsers() {
      await this.loadAllUsers();
      this.showMessage('전체 사용자 목록이 새로고침되었습니다.', 'success');
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
        // 롤백
        await this.loadAllUsers();
      }
    },

    toggleSelectAll(event) {
      if (event.target.checked) {
        this.selectedUsers = this.filteredPendingUsers.map(user => user.id);
      } else {
        this.selectedUsers = [];
      }
    },

    async bulkApprove() {
      if (this.selectedCount === 0) {
        this.showMessage('승인할 사용자를 선택해주세요.', 'info');
        return;
      }

      if (!confirm(`선택된 ${this.selectedCount}명의 사용자를 승인하시겠습니까?`)) {
        return;
      }

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

    async bulkReject() {
      if (this.selectedCount === 0) {
        this.showMessage('거부할 사용자를 선택해주세요.', 'info');
        return;
      }

      if (!confirm(`선택된 ${this.selectedCount}명의 사용자를 거부하시겠습니까?`)) {
        return;
      }

      try {
        await adminApi.bulkRejectUsers(this.selectedUsers);
        this.showMessage(`${this.selectedCount}명의 사용자가 거부되었습니다.`, 'success');
        await this.loadPendingUsers();
        await this.loadAllUsers();
        this.selectedUsers = [];
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
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
    },

    filterToday() {
      this.filters.todayOnly = !this.filters.todayOnly;
      if (this.filters.todayOnly) {
        this.showMessage('오늘 가입한 사용자만 표시됩니다.', 'info');
      } else {
        this.showMessage('모든 사용자가 표시됩니다.', 'info');
      }
    },

    onSearchInput() {
      // 디바운싱을 위한 타이머 설정
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      this.searchTimeout = setTimeout(() => {
        // 검색이 완료되면 선택된 사용자들을 초기화
        if (this.activeTab === 'pending') {
          this.selectedUsers = [];
        }
      }, 300);
    },

    clearSearch() {
      this.searchQuery = '';
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }
    },

    logout() {
      if (confirm('정말로 로그아웃하시겠습니까?')) {
        userManager.logout();
        // App.vue의 updateAuthState를 호출하여 로그인 화면으로 전환
        this.$emit('logout');
      }
    }
  }
};
</script>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background: #f8f9fa;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Fixed Header */
.admin-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 24px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #5f6368;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #f1f3f4;
}

.tab-btn.active {
  background: #e8f0fe;
  color: #1a73e8;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #dadce0;
  background: white;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #f1f3f4;
  border-color: #c4c7c5;
}

.logout-btn .material-icons {
  font-size: 18px;
}

/* Main Content */
.admin-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Tab and Filter Bar */
.tab-filter-bar {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tab-buttons {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #f1f3f4;
}

.tab-btn.active {
  background: #e8f0fe;
  color: #1a73e8;
}

.tab-btn .material-icons {
  font-size: 18px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: #f1f3f4;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #e8eaed;
}

/* Filter Section */
.filter-section {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.filter-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-row.search-row {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f3f4;
}

.all-in-one-row {
  justify-content: space-between;
  align-items: center;
}

.search-input-group {
  display: flex;
  align-items: center;
  gap: 0;
}
.search-right {
  /* width, flex, max-width 모두 제거! */
}
.search-box {
  position: relative;
  width: 240px;
  min-width: 120px;
}
.search-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #5f6368;
  font-size: 20px;
  pointer-events: none;
}
.search-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: #f1f3f4;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #e8eaed;
}

.clear-search-btn .material-icons {
  font-size: 16px;
  color: #5f6368;
}

.search-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-result-count {
  font-size: 14px;
  color: #5f6368;
  font-weight: 500;
}

/* Filter Section */
.filter-section {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.filter-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.filter-select:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
}

.today-btn.tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 60px;
  padding: 0 20px;
  border: none;
  background: transparent;
  color: #1a73e8;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  white-space: nowrap;
}
.today-btn.tab-btn.active,
.today-btn.tab-btn:hover {
  background: #e8f0fe;
}

/* Bulk Actions Bar */
.bulk-actions-inline {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto; /* 오른쪽 정렬 */
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #5f6368;
  cursor: pointer;
}

.select-all-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1a73e8;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-btn.approve {
  background: #e6f4ea;
  color: #137333;
}

.bulk-btn.approve:hover:not(:disabled) {
  background: #ceead6;
}

.bulk-btn.reject {
  background: #fce8e6;
  color: #c5221f;
}

.bulk-btn.reject:hover:not(:disabled) {
  background: #fad2cf;
}

/* Content Area */
.content-area {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #5f6368;
}

.loading-spinner {
  margin-bottom: 16px;
}

.loading-spinner .material-icons {
  font-size: 32px;
  color: #1a73e8;
}

.material-icons.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #5f6368;
  text-align: center;
}

.empty-state .material-icons {
  font-size: 48px;
  color: #dadce0;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
  color: #202124;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* User Table */
.user-table {
  overflow-x: auto;
}

.user-table table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
  border-bottom: 1px solid #e0e0e0;
}

.user-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f4;
  font-size: 14px;
  color: #202124;
}

.user-table tr:hover {
  background: #f8f9fa;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.user-select-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1a73e8;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1a73e8;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-badge {
  display: flex;
  align-items: center;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
}

.user-email {
  font-size: 12px;
  color: #5f6368;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.approved {
  background: #e6f4ea;
  color: #137333;
}

.status-badge.pending {
  background: #fef7e0;
  color: #b06000;
}

.role-select {
  padding: 4px 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.actions-col {
  width: 100px;
  text-align: center;
}

.actions-cell {
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn .material-icons {
  font-size: 18px;
}

.action-btn.approve {
  background: #e6f4ea;
  color: #137333;
}

.action-btn.approve:hover {
  background: #ceead6;
}

.action-btn.reject {
  background: #fce8e6;
  color: #c5221f;
}

.action-btn.reject:hover {
  background: #fad2cf;
}

.action-btn.delete {
  background: #fce8e6;
  color: #c5221f;
}

.action-btn.delete:hover {
  background: #fad2cf;
}

/* Notification */
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  z-index: 1000;
  max-width: 300px;
}

.notification.success {
  border-left: 4px solid #137333;
}

.notification.error {
  border-left: 4px solid #c5221f;
}

.notification.info {
  border-left: 4px solid #1a73e8;
}

.notification .material-icons {
  font-size: 20px;
}

.notification.success .material-icons {
  color: #137333;
}

.notification.error .material-icons {
  color: #c5221f;
}

.notification.info .material-icons {
  color: #1a73e8;
}

/* Material Icons */
.material-icons {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: normal;
  font-size: 1.2em;
  vertical-align: middle;
  line-height: 1;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .tab-filter-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .tab-buttons {
    justify-content: center;
  }
  
  .tab-btn {
    flex: 1;
    justify-content: center;
  }
  
  .search-container {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .search-input-group {
    max-width: none;
  }
  
  .search-stats {
    justify-content: center;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .bulk-actions-inline {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-left: 0;
  }
  
  .user-table {
    font-size: 12px;
  }
  
  .user-table th,
  .user-table td {
    padding: 8px 12px;
  }

  .search-right {
    max-width: 100%;
  }
}

.new-flex-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.filter-group {
  margin-right: 8px;
}
.search-right {
  margin-left: auto;
  width: 300px;
  max-width: 100%;
  flex: none;
  display: flex;
  align-items: center;
}
.search-box {
  width: 100%;
  position: relative;
}
.bulk-actions-inline {
  margin-left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.today-btn-in-search { border: none; background: transparent; color: #1a73e8; margin-right: 4px; border-radius: 4px; padding: 4px; transition: background 0.2s; }
.today-btn-in-search.active, .today-btn-in-search:hover { background: #e8f0fe; }
.search-input { padding-left: 36px; padding-right: 36px; width: 100%; }
.search-icon { left: 36px; }
.clear-search-btn { right: 8px; }

/* 스타일 추가 */
.custom-filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.filter-group {
  margin-right: 8px;
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.today-btn.tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 60px;
  padding: 0 20px;
  border: none;
  background: transparent;
  color: #1a73e8;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  white-space: nowrap;
}
.today-btn.tab-btn.active,
.today-btn.tab-btn:hover {
  background: #e8f0fe;
}
.search-box {
  position: relative;
  width: 240px;
  min-width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #5f6368;
  font-size: 20px;
  pointer-events: none;
}
.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: #f1f3f4;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}
.clear-search-btn:hover {
  background: #e8eaed;
}
.clear-search-btn .material-icons {
  font-size: 16px;
  color: #5f6368;
}
.bulk-actions-inline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style> 