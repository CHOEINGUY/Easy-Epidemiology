// Cloudflare Workers API 기본 URL
const API_BASE = 'https://epidemiology-auth-worker.chldlsrb07.workers.dev';

class AuthApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  // API 요청 헬퍼 함수
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    console.log('🌐 API 요청 시작:', {
      url,
      method: config.method || 'GET',
      body: config.body ? JSON.parse(config.body) : undefined
    });

    try {
      const response = await fetch(url, config);
      console.log('📡 API 응답 받음:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      // 응답 텍스트 먼저 가져오기
      const responseText = await response.text();
      console.log('📄 응답 텍스트:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ JSON 파싱 성공:', data);
      } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError);
        throw new Error(`응답 파싱 실패: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error('❌ API 요청 실패:', {
          status: response.status,
          data
        });
        throw new Error(data.message || `API 요청 실패 (${response.status})`);
      }
      
      console.log('✅ API 요청 성공:', data);
      return data;
    } catch (error) {
      console.error('❌ API 에러:', error);
      throw error;
    }
  }

  // 회원가입
  async register(userData) {
    return this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // 로그인
  async login(credentials) {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  // 토큰 검증
  async verifyToken(token) {
    return this.makeRequest('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }



  // 이메일 중복 확인
  async checkEmailAvailability(email) {
    return this.makeRequest('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // 전화번호 중복 확인
  async checkPhoneAvailability(phone) {
    return this.makeRequest('/api/auth/check-phone', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  // 헬스체크
  async healthCheck() {
    return this.makeRequest('/api/health', {
      method: 'GET'
    });
  }
}

// 관리자 API 서비스
class AdminApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  // API 요청 헬퍼 함수 (관리자용)
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API 요청 실패');
      }
      
      return data;
    } catch (error) {
      console.error('Admin API Error:', error);
      throw error;
    }
  }

  // 승인 대기 사용자 목록
  async getPendingUsers() {
    return this.makeRequest('/api/admin/pending-users', {
      method: 'GET'
    });
  }

  // 사용자 승인
  async approveUser(userId) {
    return this.makeRequest('/api/admin/approve', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // 사용자 거부
  async rejectUser(userId) {
    return this.makeRequest('/api/admin/reject', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // 일괄 사용자 승인
  async bulkApproveUsers(userIds) {
    return this.makeRequest('/api/admin/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  }

  // 일괄 사용자 거부
  async bulkRejectUsers(userIds) {
    return this.makeRequest('/api/admin/bulk-reject', {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  }

  // 전체 사용자 목록
  async getAllUsers() {
    return this.makeRequest('/api/admin/users', {
      method: 'GET'
    });
  }

  // 사용자 삭제
  async deleteUser(userId) {
    return this.makeRequest(`/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE'
    });
  }

  // 사용자 권한 변경
  async updateUserRole(userId, role) {
    return this.makeRequest('/api/admin/update-role', {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });
  }

  // 사용자 정보 업데이트
  async updateUserInfo(userId, userInfo) {
    return this.makeRequest('/api/admin/update-user-info', {
      method: 'POST',
      body: JSON.stringify({ userId, ...userInfo })
    });
  }
}

// 싱글톤 인스턴스 생성
export const authApi = new AuthApiService();
export const adminApi = new AdminApiService();

// 토큰 관리 유틸리티
export const tokenManager = {
  // 토큰 저장
  saveToken(token) {
    localStorage.setItem('authToken', token);
  },

  // 토큰 가져오기
  getToken() {
    return localStorage.getItem('authToken');
  },

  // 토큰 삭제
  removeToken() {
    localStorage.removeItem('authToken');
  },

  // 토큰 유효성 확인
  async validateToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const result = await authApi.verifyToken(token);
      if (result.success && (result.data.user.isApproved || result.data.user.approved)) {
        // 토큰이 유효하면 사용자 정보도 업데이트
        userManager.saveUser(result.data.user);
        return true;
      } else {
        // 토큰이 유효하지 않으면 정리
        this.removeToken();
        userManager.removeUser();
        return false;
      }
    } catch (error) {
      console.error('토큰 검증 실패:', error);
      // 에러 발생 시 정리
      this.removeToken();
      userManager.removeUser();
      return false;
    }
  }
};

// 사용자 상태 관리
export const userManager = {
  // 사용자 정보 저장
  saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // 사용자 정보 가져오기
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // 사용자 정보 삭제
  removeUser() {
    localStorage.removeItem('user');
  },

  // 로그인 상태 확인
  isLoggedIn() {
    const user = this.getUser();
    const token = tokenManager.getToken();
    
    // 사용자 정보와 토큰이 모두 있어야 로그인 상태로 간주
    if (!user || !token) {
      return false;
    }
    
    // 사용자가 승인된 상태인지 확인 (둘 다 체크)
    const isApproved = user.isApproved || user.approved;
    
    return isApproved;
  },

  // 관리자 권한 확인
  isAdmin() {
    const user = this.getUser();
    return user && (user.role === 'admin' || user.role === 'support');
  },

  // 로그아웃
  logout() {
    tokenManager.removeToken();
    this.removeUser();
  }
}; 