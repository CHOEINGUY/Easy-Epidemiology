<template>
  <div class="auth-screen">
    <div class="auth-container">
      <!-- 로고 및 제목 -->
      <div class="logo-section">
        <h1 class="app-title">Easy-Epidemiology Web v1.0</h1>
        <p class="app-subtitle">역학조사 데이터 분석 시스템</p>
      </div>
      
      <!-- 로그인 폼 -->
      <div class="auth-form" v-if="!showRegister">
        <h2 class="form-title">로그인</h2>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="login-username">아이디</label>
            <input
              id="login-username"
              v-model="loginData.username"
              type="text"
              placeholder="아이디를 입력하세요"
              required
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-group">
            <label for="login-password">패스워드</label>
            <div class="password-input-container">
              <input
                id="login-password"
                v-model="loginData.password"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="패스워드를 입력하세요"
                required
                :disabled="isLoading"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showLoginPassword = !showLoginPassword"
                :disabled="isLoading"
              >
                <span class="material-icons">
                  {{ showLoginPassword ? 'visibility' : 'visibility_off' }}
                </span>
              </button>
            </div>
          </div>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="login-btn primary-btn"
              :disabled="isLoading || !loginData.username || !loginData.password"
            >
              <span v-if="isLoading">로그인 중...</span>
              <span v-else>로그인</span>
            </button>
          </div>
        </form>
        
        <div class="form-footer">
          <p>
            계정이 없으신가요? 
            <button type="button" class="link-btn" @click="showRegisterForm">
              회원가입
            </button>
          </p>
        </div>
      </div>
      
      <!-- 회원가입 폼 -->
      <div class="auth-form" v-if="showRegister">
        <h2 class="form-title">회원가입</h2>
        
        <!-- 1단계: 기본 정보 -->
        <form v-if="registerStep === 1" @submit.prevent="nextStep" class="register-form">
          <div class="step-indicator">
            <span class="step active">1</span>
            <span class="step-line"></span>
            <span class="step">2</span>
          </div>
          
          <div class="form-group">
            <label for="register-name">사용자 이름</label>
            <input
              id="register-name"
              v-model="registerData.name"
              type="text"
              placeholder="실명을 입력하세요"
              required
              :disabled="isLoading"
              maxlength="50"
            />
            <small class="form-help">실명을 입력해주세요 (관리자 승인 시 확인용)</small>
          </div>
          
          <div class="form-group">
            <label for="register-username">아이디</label>
            <input
              id="register-username"
              v-model="registerData.username"
              type="text"
              placeholder="아이디를 입력하세요"
              required
              :disabled="isLoading"
              minlength="3"
              maxlength="20"
              @input="checkUsernameAvailability"
            />
            <small class="form-help">3-20자 영문, 숫자, 언더스코어만 사용 가능</small>
            <div v-if="isCheckingUsername" class="username-status checking">
              사용자명 확인 중...
            </div>
            <div v-else-if="usernameAvailable === true" class="username-status available">
              ✅ 사용 가능한 사용자명입니다
            </div>
            <div v-else-if="usernameAvailable === false" class="username-status unavailable">
              ❌ 이미 사용 중인 사용자명입니다
            </div>
          </div>
          
          <div class="form-group">
            <label for="register-password">패스워드</label>
            <div class="password-input-container">
              <input
                id="register-password"
                v-model="registerData.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                placeholder="패스워드를 입력하세요"
                required
                :disabled="isLoading"
                minlength="6"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showRegisterPassword = !showRegisterPassword"
                :disabled="isLoading"
              >
                <span class="material-icons">
                  {{ showRegisterPassword ? 'visibility' : 'visibility_off' }}
                </span>
              </button>
            </div>
            <small class="form-help">최소 6자 이상</small>
          </div>
          
          <div class="form-group">
            <label for="register-confirm-password">패스워드 확인</label>
            <div class="password-input-container">
              <input
                id="register-confirm-password"
                v-model="registerData.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="패스워드를 다시 입력하세요"
                required
                :disabled="isLoading"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showConfirmPassword = !showConfirmPassword"
                :disabled="isLoading"
              >
                <span class="material-icons">
                  {{ showConfirmPassword ? 'visibility' : 'visibility_off' }}
                </span>
              </button>
            </div>
            <small v-if="passwordMismatch" class="form-error">패스워드가 일치하지 않습니다</small>
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="next-btn primary-btn"
              :disabled="isLoading || !isStep1Valid"
            >
              다음 단계
            </button>
          </div>
        </form>
        
        <!-- 2단계: 상세 정보 -->
        <form v-if="registerStep === 2" @submit.prevent="handleRegister" class="register-form">
          <div class="step-indicator">
            <span class="step completed">1</span>
            <span class="step-line"></span>
            <span class="step active">2</span>
          </div>
          
          <div class="form-group">
            <label for="register-email">이메일</label>
            <input
              id="register-email"
              v-model="registerData.email"
              type="email"
              placeholder="이메일을 입력하세요"
              required
              :disabled="isLoading"
            />
            <small class="form-help">관리자 승인 시 연락 수단으로 사용됩니다</small>
          </div>
          
          <div class="form-group">
            <label for="register-organization-type">소속 유형</label>
            <select
              id="register-organization-type"
              v-model="registerData.organizationType"
              required
              :disabled="isLoading"
              class="form-select"
            >
              <option value="">소속 유형을 선택하세요</option>
              <option value="보건소">보건소</option>
              <option value="지원단">지원단</option>
              <option value="기타">기타</option>
            </select>
            <small class="form-help">소속 기관의 유형을 선택해주세요</small>
          </div>

          <!-- 보건소/지원단 선택 시 지역 선택 -->
          <div v-if="registerData.organizationType === '보건소' || registerData.organizationType === '지원단'" class="form-group">
            <label for="register-province">시/도</label>
            <select
              id="register-province"
              v-model="registerData.province"
              required
              :disabled="isLoading"
              class="form-select"
            >
              <option value="">시/도를 선택하세요</option>
              <option v-for="province in provinces" :key="province" :value="province">
                {{ province }}
              </option>
            </select>
          </div>

          <div v-if="registerData.organizationType === '보건소' || registerData.organizationType === '지원단'" class="form-group">
            <label for="register-district">시/군/구</label>
            <select
              id="register-district"
              v-model="registerData.district"
              required
              :disabled="isLoading"
              class="form-select"
            >
              <option value="">시/군/구를 선택하세요</option>
              <option v-for="district in availableDistricts" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="register-organization">소속명</label>
            <input
              id="register-organization"
              v-model="registerData.organization"
              type="text"
              :placeholder="getOrganizationPlaceholder()"
              required
              :disabled="isLoading"
            />
            <small class="form-help">{{ getOrganizationHelpText() }}</small>
          </div>
          
          <div class="form-group">
            <label for="register-phone">전화번호 (선택사항)</label>
            <input
              id="register-phone"
              v-model="registerData.phone"
              type="tel"
              placeholder="전화번호를 입력하세요 (예: 010-1234-5678)"
              :disabled="isLoading"
            />
            <small class="form-help">필요시 관리자가 연락할 수 있습니다</small>
          </div>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div class="form-actions">
            <button 
              type="button" 
              class="back-btn secondary-btn"
              @click="prevStep"
              :disabled="isLoading"
            >
              이전 단계
            </button>
            <button 
              type="submit" 
              class="register-btn primary-btn"
              :disabled="isLoading || !isRegisterFormValid"
            >
              <span v-if="isLoading">가입 중...</span>
              <span v-else>회원가입</span>
            </button>
          </div>
        </form>
        
        <div class="form-footer">
          <p>
            이미 계정이 있으신가요? 
            <button type="button" class="link-btn" @click="showLoginForm">
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authApi, tokenManager, userManager } from '../services/authApi.js';

export default {
  name: 'AuthScreen',
  
  data() {
    return {
      showRegister: false,
      registerStep: 1,
      isLoading: false,
      error: '',
      showLoginPassword: false,
      showRegisterPassword: false,
      showConfirmPassword: false,
      usernameCheckTimer: null,
      usernameAvailable: null,
      isCheckingUsername: false,
      loginData: {
        username: '',
        password: ''
      },
      registerData: {
        name: '', // 사용자 이름
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        organizationType: '', // 보건소, 지원단, 기타
        province: '', // 시/도
        district: '', // 시/군/구
        organization: '', // 소속명
        phone: ''
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
    passwordMismatch() {
      return this.registerData.password && 
             this.registerData.confirmPassword && 
             this.registerData.password !== this.registerData.confirmPassword;
    },
    
    isStep1Valid() {
      return this.registerData.name.trim().length > 0 &&
             this.registerData.username.length >= 3 &&
             this.registerData.password.length >= 6 &&
             this.registerData.password === this.registerData.confirmPassword &&
             !this.passwordMismatch;
    },
    
    isRegisterFormValid() {
      const basicValid = this.isStep1Valid &&
                        this.registerData.email.includes('@') &&
                        this.registerData.organizationType &&
                        this.registerData.organization.trim().length > 0;
      
      // 보건소/지원단인 경우 지역 선택 필수
      if (this.registerData.organizationType === '보건소' || this.registerData.organizationType === '지원단') {
        return basicValid && this.registerData.province && this.registerData.district;
      }
      
      return basicValid;
    },

    availableDistricts() {
      if (!this.registerData.province) return [];
      return this.districts[this.registerData.province] || [];
    }
  },
  
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.error = '';
      
      try {
        const result = await authApi.login({
          username: this.loginData.username,
          password: this.loginData.password
        });
        
        // 토큰과 사용자 정보 저장
        tokenManager.saveToken(result.data.token);
        userManager.saveUser(result.data.user);
        
        // 로그인 성공 시 폼 초기화
        this.loginData = { username: '', password: '' };
        
        // 부모 컴포넌트에 로그인 성공 알림
        this.$emit('login-success');
        
      } catch (error) {
        this.error = error.message || '로그인에 실패했습니다.';
        console.error('로그인 실패:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    async handleRegister() {
      if (!this.isRegisterFormValid) {
        return;
      }
      
      this.isLoading = true;
      this.error = '';
      
      try {
        await authApi.register({
          name: this.registerData.name,
          username: this.registerData.username,
          password: this.registerData.password,
          email: this.registerData.email,
          organizationType: this.registerData.organizationType,
          province: this.registerData.province,
          district: this.registerData.district,
          organization: this.registerData.organization,
          phone: this.registerData.phone
        });
        
        // 회원가입 성공 시 폼 초기화
        this.registerData = { 
          name: '',
          username: '', 
          password: '', 
          confirmPassword: '', 
          email: '', 
          organizationType: '',
          province: '',
          district: '',
          organization: '', 
          phone: '' 
        };
        this.registerStep = 1; // 단계 초기화
        // 비밀번호 보이기 상태 초기화
        this.showRegisterPassword = false;
        this.showConfirmPassword = false;
        
        // 로그인 폼으로 전환
        this.showLoginForm();
        
        // 성공 메시지 표시
        this.error = '';
        alert('회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.');
        
      } catch (error) {
        this.error = error.message || '회원가입에 실패했습니다.';
        console.error('회원가입 실패:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    showRegisterForm() {
      this.error = '';
      this.showRegister = true;
    },
    
    nextStep() {
      if (this.isStep1Valid) {
        this.registerStep = 2;
        this.error = '';
      }
    },
    
    async checkUsernameAvailability() {
      const username = this.registerData.username.trim();
      
      // 기존 타이머 클리어
      if (this.usernameCheckTimer) {
        clearTimeout(this.usernameCheckTimer);
      }
      
      // 사용자명이 3자 미만이면 체크하지 않음
      if (username.length < 3) {
        this.usernameAvailable = null;
        this.isCheckingUsername = false;
        return;
      }
      
      // 500ms 후에 API 호출 (타이핑 중에는 호출하지 않음)
      this.usernameCheckTimer = setTimeout(async () => {
        this.isCheckingUsername = true;
        this.usernameAvailable = null;
        
        try {
          const result = await authApi.checkUsername(username);
          this.usernameAvailable = result.data.available;
        } catch (error) {
          console.error('사용자명 확인 실패:', error);
          this.usernameAvailable = null;
        } finally {
          this.isCheckingUsername = false;
        }
      }, 500);
    },
    
    prevStep() {
      this.registerStep = 1;
      this.error = '';
    },
    
    showLoginForm() {
      this.error = '';
      this.showRegister = false;
      this.registerStep = 1; // 단계 초기화
      // 비밀번호 보이기 상태 초기화
      this.showLoginPassword = false;
      this.showRegisterPassword = false;
      this.showConfirmPassword = false;
    },

    getOrganizationPlaceholder() {
      if (this.registerData.organizationType === '보건소') {
        return '예: 강남구보건소, 서초구보건소';
      } else if (this.registerData.organizationType === '지원단') {
        return '예: 중앙역학조사지원단, 서울시역학조사지원단';
      } else {
        return '예: 서울대학교, 질병관리청, 연구기관명';
      }
    },

    getOrganizationHelpText() {
      if (this.registerData.organizationType === '보건소') {
        return '보건소의 정확한 명칭을 입력해주세요';
      } else if (this.registerData.organizationType === '지원단') {
        return '지원단의 정확한 명칭을 입력해주세요';
      } else {
        return '소속 기관이나 단체의 정확한 명칭을 입력해주세요';
      }
    }
  }
};
</script>

<style scoped>
.auth-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  padding: 40px;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.app-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 1rem;
  color: #666;
  margin: 0;
  font-weight: 400;
}

.auth-form {
  width: 100%;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 30px 0;
  text-align: center;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
  background: #fafbfc;
}

.form-group select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

/* 비밀번호 입력 컨테이너 */
.password-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-container input {
  padding-right: 50px; /* 버튼 공간 확보 */
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  transition: background-color 0.2s;
  z-index: 10;
}

.password-toggle:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 사용자명 상태 표시 */
.username-status {
  margin-top: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.username-status.checking {
  color: #17a2b8;
}

.username-status.available {
  color: #28a745;
}

.username-status.unavailable {
  color: #dc3545;
}

.form-help {
  display: block;
  margin-top: 6px;
  color: #6c757d;
  font-size: 0.8rem;
}

.form-error {
  display: block;
  margin-top: 6px;
  color: #dc3545;
  font-size: 0.8rem;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 0.9rem;
  border: 1px solid #f5c6cb;
}

.form-actions {
  margin-bottom: 24px;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.primary-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.form-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.form-footer p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
  font-weight: 500;
}

.link-btn:hover {
  color: #5a6fd8;
}

/* 2단계 회원가입 스타일 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  gap: 10px;
}

.step {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  background-color: #e1e5e9;
  color: #666;
  transition: all 0.3s ease;
}

.step.active {
  background-color: #667eea;
  color: white;
}

.step.completed {
  background-color: #28a745;
  color: white;
}

.step-line {
  width: 40px;
  height: 2px;
  background-color: #e1e5e9;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.form-actions .primary-btn {
  flex: 1;
}

.secondary-btn {
  padding: 14px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #667eea;
  flex: 1;
}

.secondary-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.secondary-btn:disabled {
  border-color: #6c757d;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

/* 반응형 디자인 */
@media (max-width: 480px) {
  .auth-container {
    padding: 30px 20px;
    margin: 10px;
  }
  
  .app-title {
    font-size: 1.8rem;
  }
  
  .form-group input {
    padding: 12px 14px;
  }
  
  .primary-btn {
    padding: 12px;
  }
}

/* 스타일 추가 */
.password-toggle .material-icons {
  font-size: 24px;
}
</style> 