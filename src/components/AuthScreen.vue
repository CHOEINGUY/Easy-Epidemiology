<template>
  <div class="auth-screen">
    <div class="auth-container">
      <!-- 로고 및 제목 -->
      <div class="logo-section">
        <h1 class="app-title">Easy-Epidemiology</h1>
        <p class="app-subtitle">역학조사 데이터 분석 시스템</p>
      </div>
      
      <!-- 탭 네비게이션 -->
      <div class="tab-navigation">
        <button 
          class="tab-btn" 
          :class="{ active: !showRegister }"
          @click="showRegister = false"
          ref="loginTab"
        >
          로그인
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: showRegister }"
          @click="showRegister = true"
          ref="registerTab"
        >
          회원가입
        </button>
      </div>
      
      <!-- 로그인 폼 -->
      <div class="auth-form" v-if="!showRegister">
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group" :class="{ 'has-error': loginErrors.identifier }">
            <label for="login-identifier">이메일 또는 전화번호</label>
            <div class="input-container">
              <input
                id="login-identifier"
                :value="loginDisplayValue"
                type="text"
                :placeholder="placeholderText"
                required
                :disabled="isLoading"
                @input="handleLoginIdentifierInput"
                @keydown="handleLoginIdentifierKeydown"
                @blur="validateLoginField('identifier')"
                ref="loginIdentifier"
                autocomplete="off"
                :class="inputFieldClass"
              />
              <span v-if="loginErrors.identifier" class="error-icon">
                <span class="material-icons">error</span>
              </span>
              <span v-else-if="loginData.identifier && !loginErrors.identifier" class="success-icon">
                <span class="material-icons">check_circle</span>
              </span>
            </div>
          </div>
          
          <div class="form-group" :class="{ 'has-error': loginErrors.password }">
            <label for="login-password">비밀번호</label>
            <div class="password-input-container">
              <input
                id="login-password"
                v-model="loginData.password"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="비밀번호를 입력하세요"
                required
                :disabled="isLoading"
                @keydown="handleKeydown"
                @blur="validateLoginField('password')"
                ref="loginPassword"
              />
              <button
                type="button"
                class="password-toggle"
                :class="{ 'shifted': loginData.password && (!loginErrors.password || loginErrors.password) }"
                @click="showLoginPassword = !showLoginPassword"
                :disabled="isLoading"
                tabindex="0"
              >
                <span class="material-icons">
                  {{ showLoginPassword ? 'visibility' : 'visibility_off' }}
                </span>
              </button>
              <span v-if="loginErrors.password" class="error-icon">
                <span class="material-icons">error</span>
              </span>
              <span v-else-if="loginData.password && !loginErrors.password" class="success-icon">
                <span class="material-icons">check_circle</span>
              </span>
            </div>
            <small v-if="loginErrors.password" class="form-error">
              {{ loginErrors.password }}
            </small>
          </div>
          
          <div v-if="error" class="error-message" role="alert">
            <span class="material-icons">warning</span>
            {{ error }}
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="login-btn primary-btn"
              :disabled="isLoading || !loginData.identifier || !loginData.password"
              ref="loginSubmit"
            >
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-if="isLoading">로그인 중...</span>
              <span v-else>로그인</span>
            </button>
          </div>
        </form>
      </div>
      
      <!-- 회원가입 폼 - 2단계 카드 구조 -->
      <div class="auth-form" v-if="showRegister">
        <!-- 1단계: 기본 정보 -->
        <transition name="step-transition" mode="out-in">
          <div v-if="registerStep === 1" class="register-step" key="step1">
            <div class="step-indicator">
              <span class="step-number active">1</span>
              <span class="step-line"></span>
              <span class="step-number">2</span>
              <span class="step-line"></span>
              <span class="step-number">3</span>
            </div>
            <h3 class="step-title">기본 정보 입력</h3>
            
            <form @submit.prevent="nextStep" class="register-form">
              <div class="form-group" :class="{ 
                'has-error': registerErrors.name,
                'success': registerData.name && !registerErrors.name
              }">
                <label for="register-name">이름</label>
                <div class="input-container">
                  <input
                    id="register-name"
                    v-model="registerData.name"
                    type="text"
                    placeholder="실명을 입력하세요"
                    required
                    :disabled="isLoading"
                    maxlength="50"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('name')"
                    @focus="handleNameFocus"
                    ref="registerName"
                  />
                  <span v-if="registerErrors.name" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.name && !registerErrors.name" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.name" class="form-error">
                  {{ registerErrors.name }}
                </small>
              </div>
              
              <div class="form-group" :class="{ 
                'has-error': registerErrors.email,
                'success': registerData.email && !registerErrors.email
              }">
                <label for="register-email">이메일 주소</label>
                <div class="input-container">
                  <input
                    id="register-email"
                    :value="registerDisplayValue"
                    type="text"
                    placeholder="이메일 주소를 입력하세요"
                    required
                    :disabled="isLoading"
                    @input="handleEmailInput"
                    @keydown="handleEmailKeydown"
                    @blur="handleEmailBlur"
                    @focus="handleEmailFocus"
                    ref="registerEmail"
                    autocomplete="off"
                  />
                  <span v-if="registerErrors.email" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.email && !registerErrors.email" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.email" class="form-error">
                  {{ registerErrors.email }}
                </small>
              </div>
              
              <div class="form-group" :class="{ 
                'has-error': registerErrors.phone,
                'success': registerData.phone && !registerErrors.phone
              }">
                <label for="register-phone">전화번호</label>
                <div class="input-container">
                  <input
                    id="register-phone"
                    v-model="registerData.phone"
                    type="tel"
                    placeholder="전화번호를 입력하세요 (예: 01012345678)"
                    required
                    :disabled="isLoading"
                    @input="handlePhoneInput"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('phone')"
                    @focus="handlePhoneFocus"
                    maxlength="13"
                    ref="registerPhone"
                  />
                  <span v-if="registerErrors.phone" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.phone && !registerErrors.phone" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.phone" class="form-error">
                  {{ registerErrors.phone }}
                </small>
              </div>
              
              <div class="form-help-section">
                <small class="form-help">이메일 또는 전화번호로 로그인할 수 있습니다.</small>
              </div>
              
              <div v-if="error && !isLoading" class="error-message" role="alert">
                <span class="material-icons">warning</span>
                {{ error }}
              </div>
              
              <div class="form-actions">
                <button 
                  type="submit" 
                  class="primary-btn"
                  :disabled="isLoading || !registerData.name || !registerData.email || !registerData.phone"
                >
                  <span v-if="isLoading" class="loading-spinner"></span>
                  <span v-if="isLoading">다음 단계로 이동 중...</span>
                  <span v-else>다음 단계</span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- 2단계: 비밀번호 설정 -->
          <div v-else-if="registerStep === 2" class="register-step" key="step2">
            <div class="step-indicator">
              <span class="step-number">1</span>
              <span class="step-line"></span>
              <span class="step-number active">2</span>
              <span class="step-line"></span>
              <span class="step-number">3</span>
            </div>
            <h3 class="step-title">비밀번호 설정</h3>
            
            <form @submit.prevent="nextStep" class="register-form">
              <div class="form-group" :class="{ 
                'has-error': registerErrors.password,
                'success': registerData.password && !registerErrors.password
              }">
                <label for="register-password">비밀번호</label>
                <div class="password-input-container">
                  <input
                    id="register-password"
                    v-model="registerData.password"
                    :type="showRegisterPassword ? 'text' : 'password'"
                    placeholder="8자 이상의 안전한 비밀번호를 입력하세요"
                    required
                    :disabled="isLoading"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('password')"
                    @focus="handlePasswordFocus"
                    ref="registerPassword"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    :class="{ 'shifted': registerData.password && (!registerErrors.password || registerErrors.password) }"
                    @click="showRegisterPassword = !showRegisterPassword"
                    :disabled="isLoading"
                    tabindex="0"
                  >
                    <span class="material-icons">
                      {{ showRegisterPassword ? 'visibility' : 'visibility_off' }}
                    </span>
                  </button>
                  <span v-if="registerErrors.password" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.password && !registerErrors.password" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.password" class="form-error">
                  {{ registerErrors.password }}
                </small>
              </div>
              
              <div class="form-group" :class="{ 
                'has-error': registerErrors.confirmPassword,
                'success': registerData.confirmPassword && !registerErrors.confirmPassword
              }">
                <label for="register-confirm-password">비밀번호 확인</label>
                <div class="password-input-container">
                  <input
                    id="register-confirm-password"
                    v-model="registerData.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                    :disabled="isLoading"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('confirmPassword')"
                    @focus="handleConfirmPasswordFocus"
                    ref="registerConfirmPassword"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    :class="{ 'shifted': registerData.confirmPassword && (!registerErrors.confirmPassword || registerErrors.confirmPassword) }"
                    @click="showConfirmPassword = !showConfirmPassword"
                    :disabled="isLoading"
                    tabindex="0"
                  >
                    <span class="material-icons">
                      {{ showConfirmPassword ? 'visibility' : 'visibility_off' }}
                    </span>
                  </button>
                  <span v-if="registerErrors.confirmPassword" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.confirmPassword && !registerErrors.confirmPassword" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.confirmPassword" class="form-error">
                  {{ registerErrors.confirmPassword }}
                </small>
              </div>
              
              <div v-if="error && !isLoading" class="error-message" role="alert">
                <span class="material-icons">warning</span>
                {{ error }}
              </div>
              
              <div class="form-actions">
                <button 
                  type="button" 
                  class="secondary-btn"
                  @click="registerStep = 1"
                  :disabled="isLoading"
                >
                  이전 단계
                </button>
                <button 
                  type="submit" 
                  class="primary-btn"
                  :disabled="isLoading || !registerData.password || !registerData.confirmPassword"
                >
                  <span v-if="isLoading" class="loading-spinner"></span>
                  <span v-if="isLoading">다음 단계로 이동 중...</span>
                  <span v-else>다음 단계</span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- 3단계: 소속 정보 -->
          <div v-else-if="registerStep === 3" class="register-step" key="step3">
            <div class="step-indicator">
              <span class="step-number">1</span>
              <span class="step-line"></span>
              <span class="step-number">2</span>
              <span class="step-line"></span>
              <span class="step-number active">3</span>
            </div>
            <h3 class="step-title">소속 정보 입력</h3>
            
            <form @submit.prevent="handleRegister" class="register-form">
              <div class="form-group" :class="{ 
                'has-error': registerErrors.affiliationType,
                'success': registerData.affiliationType && !registerErrors.affiliationType
              }">
                <label for="register-affiliation-type">소속 유형</label>
                <div class="input-container">
                  <select
                    id="register-affiliation-type"
                    v-model="registerData.affiliationType"
                    required
                    :disabled="isLoading"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('affiliationType')"
                    @focus="handleAffiliationTypeFocus"
                    ref="registerAffiliationType"
                    class="custom-select"
                  >
                    <option value="">소속 유형을 선택하세요</option>
                    <option value="hospital">병원</option>
                    <option value="clinic">의원</option>
                    <option value="public_health">보건소</option>
                    <option value="university">대학교</option>
                    <option value="research">연구기관</option>
                    <option value="government">정부기관</option>
                    <option value="other">기타</option>
                  </select>
                  <span v-if="registerErrors.affiliationType" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.affiliationType && !registerErrors.affiliationType" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.affiliationType" class="form-error">
                  {{ registerErrors.affiliationType }}
                </small>
              </div>
              
              <div class="form-group" :class="{ 
                'has-error': registerErrors.affiliation,
                'success': registerData.affiliation && !registerErrors.affiliation
              }">
                <label for="register-affiliation">소속명</label>
                <div class="input-container">
                  <input
                    id="register-affiliation"
                    v-model="registerData.affiliation"
                    type="text"
                    placeholder="소속 기관명을 입력하세요"
                    required
                    :disabled="isLoading"
                    @keydown="handleKeydown"
                    @blur="validateRegisterField('affiliation')"
                    @focus="handleAffiliationFocus"
                    ref="registerAffiliation"
                  />
                  <span v-if="registerErrors.affiliation" class="error-icon">
                    <span class="material-icons">error</span>
                  </span>
                  <span v-else-if="registerData.affiliation && !registerErrors.affiliation" class="success-icon">
                    <span class="material-icons">check_circle</span>
                  </span>
                </div>
                <small v-if="registerErrors.affiliation" class="form-error">
                  {{ registerErrors.affiliation }}
                </small>
              </div>
              
              <div v-if="error && !isLoading" class="error-message" role="alert">
                <span class="material-icons">warning</span>
                {{ error }}
              </div>
              
              <div class="form-actions">
                <button 
                  type="button" 
                  class="secondary-btn"
                  @click="registerStep = 2"
                  :disabled="isLoading"
                >
                  이전 단계
                </button>
                <button 
                  type="submit" 
                  class="primary-btn"
                  :disabled="isLoading || !registerData.affiliationType || !registerData.affiliation"
                >
                  <span v-if="isLoading" class="loading-spinner"></span>
                  <span v-if="isLoading">회원가입 중...</span>
                  <span v-else>회원가입 완료</span>
                </button>
              </div>
            </form>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- 회원가입 완료 모달 -->
    <div v-if="showRegistrationSuccess" class="modal-overlay" @click="closeRegistrationSuccess">
      <div class="modal-content" @click.stop>
        <div class="success-icon-large">
          <span class="material-icons">check_circle</span>
        </div>
        <h3 class="modal-title">회원가입이 완료되었습니다!</h3>
        <p class="modal-message">
          입력하신 정보가 정상적으로 등록되었습니다.<br>
          <strong>상위 기관의 승인을 기다려주세요.</strong><br>
          승인 완료 후 로그인이 가능합니다.
        </p>
        <div class="modal-actions">
          <button class="primary-btn" @click="closeRegistrationSuccess">
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authApi } from '../services/authApi';

export default {
  name: 'AuthScreen',
  data() {
    return {
      // 상태 관리
      showRegister: false,
      isLoading: false,
      error: '',
      registerStep: 1,
      showRegistrationSuccess: false, // 회원가입 성공 모달 표시 여부
      
      // 로그인 관련
      loginData: {
        identifier: '',
        password: ''
      },
      showLoginPassword: false,
      identifierType: '',
      
      // 회원가입 관련
      registerData: {
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        affiliation: '',
        affiliationType: ''
      },
      showRegisterPassword: false,
      showConfirmPassword: false,
      
      // 이메일 자동완성 관련 (React 방식)
      // userInput: 사용자가 직접 타이핑한 값
      loginUserInput: '',
      registerUserInput: '',
      // suggestion: 화면에 회색으로 보여줄 제안 텍스트
      loginSuggestion: '',
      registerSuggestion: '',
      
      // 새로운 입력 타입 감지 시스템
      currentInputType: 'ambiguous', // 'phone', 'email', 'ambiguous'
      previousInputType: 'ambiguous',
      inputProcessingState: {
        isProcessing: false,
        lastProcessedValue: '',
        modeTransition: false
      },
      
      // 이메일 도메인 목록
      emailDomains: [
        'gmail.com',
        'naver.com',
        'daum.net',
        'hanmail.net',
        'nate.com',
        'korea.kr',
        'kakao.com',
        'icloud.com',
        'outlook.com',
        'hotmail.com'
      ],
      
      // 유효성 검사 관련
      loginErrors: {
        identifier: '',
        password: ''
      },
      registerErrors: {
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        affiliationType: '',
        affiliation: ''
      }
    };
  },
  
  computed: {
    // 화면에 실제로 보여지는 전체 텍스트 (사용자 입력 + 제안)
    loginDisplayValue() {
      return this.loginUserInput + this.loginSuggestion;
    },
    
    registerDisplayValue() {
      return this.registerUserInput + this.registerSuggestion;
    },
    
    // 입력 필드 시각적 피드백
    inputFieldClass() {
      return {
        'input-field': true,
        'phone-mode': this.currentInputType === 'phone',
        'email-mode': this.currentInputType === 'email',
        'ambiguous-mode': this.currentInputType === 'ambiguous',
        'has-suggestion': !!this.loginSuggestion
      };
    },
    
    // 동적 플레이스홀더
    placeholderText() {
      switch (this.currentInputType) {
      case 'phone':
        return '전화번호를 입력하세요 (예: 01012345678)';
      case 'email':
        return '이메일 주소를 입력하세요';
      default:
        return '이메일 또는 전화번호를 입력하세요';
      }
    },
    
    // 1단계 유효성 검사
    isStep1Valid() {
      const data = this.registerData;
      return data.name && 
             data.email && 
             data.phone &&
             !this.registerErrors.name &&
             !this.registerErrors.email &&
             !this.registerErrors.phone;
    },
    
    // 2단계 유효성 검사
    passwordMismatch() {
      return this.registerData.password && 
             this.registerData.confirmPassword && 
             this.registerData.password !== this.registerData.confirmPassword;
    },
    
    isStep2Valid() {
      const data = this.registerData;
      return data.password && 
             data.confirmPassword && 
             !this.passwordMismatch &&
             !this.registerErrors.password &&
             !this.registerErrors.confirmPassword;
    },
    
    // 3단계 유효성 검사
    isStep3Valid() {
      const data = this.registerData;
      return data.affiliation && 
             data.affiliationType &&
             !this.registerErrors.affiliation &&
             !this.registerErrors.affiliationType;
    }
  },
  
  watch: {
    showRegister() {
      this.resetForms();
    },
    
    // 인증 상태 변화 감지 (로그아웃 시 폼 초기화)
    '$store.state.auth.isAuthenticated'(newValue, oldValue) {
      console.log('🔍 인증 상태 변화 감지:', { newValue, oldValue });
      if (oldValue === true && newValue === false) {
        console.log('🚪 로그아웃 감지 - 폼 초기화');
        this.resetForms();
      }
    },
    
    // 실시간 유효성 검사
    loginUserInput() {
      this.detectIdentifierType();
      if (this.loginErrors.identifier) {
        this.validateLoginField('identifier');
      }
    },
    
    'loginData.password'() {
      if (this.loginErrors.password) {
        this.validateLoginField('password');
      }
    },
    
    'registerData.name'() {
      if (this.registerErrors.name) {
        this.validateRegisterField('name');
      }
    },
    
    registerUserInput() {
      this.detectIdentifierType();
      if (this.registerErrors.email) {
        this.validateRegisterField('email');
      }
    },
    

    
    'registerData.phone'() {
      if (this.registerErrors.phone) {
        this.validateRegisterField('phone');
      }
    },
    
    'registerData.password'() {
      if (this.registerErrors.password) {
        this.validateRegisterField('password');
      }
      if (this.registerErrors.confirmPassword) {
        this.validateRegisterField('confirmPassword');
      }
    },
    
    'registerData.confirmPassword'() {
      if (this.registerErrors.confirmPassword) {
        this.validateRegisterField('confirmPassword');
      }
    },
    
    'registerData.affiliationType'() {
      if (this.registerErrors.affiliationType) {
        this.validateRegisterField('affiliationType');
      }
    },
    
    'registerData.affiliation'() {
      if (this.registerErrors.affiliation) {
        this.validateRegisterField('affiliation');
      }
    }
  },
  
  mounted() {
    // 초기 포커스 설정
    this.$nextTick(() => {
      if (!this.showRegister) {
        this.$refs.loginIdentifier?.focus();
      } else {
        this.$refs.registerName?.focus();
      }
    });
  },
  
  methods: {
    // 키보드 네비게이션 처리
    handleKeydown(event) {
      if (this.isLoading) return;
      
      // Tab 키 처리
      if (event.key === 'Tab') {
        // 기본 Tab 동작 허용 (브라우저가 자동으로 다음 요소로 이동)
        return;
      }
      
      // Enter 키 처리
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleEnterKey(event);
      }
      
      // Escape 키 처리
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
    },
    
    // Enter 키 처리
    handleEnterKey(event) {
      const currentElement = event.target;
      
      // 로그인 폼에서
      if (!this.showRegister) {
        if (currentElement.id === 'login-identifier') {
          this.$refs.loginPassword?.focus();
        } else if (currentElement.id === 'login-password') {
          this.handleLogin();
        }
      } else {
        // 회원가입 폼에서
        if (this.registerStep === 1) {
          if (currentElement.id === 'register-name') {
            this.$refs.registerEmail?.focus();
          } else if (currentElement.id === 'register-email') {
            this.$refs.registerPhone?.focus();
          } else if (currentElement.id === 'register-phone') {
            this.nextStep();
          }
        } else if (this.registerStep === 2) {
          if (currentElement.id === 'register-password') {
            this.$refs.registerConfirmPassword?.focus();
          } else if (currentElement.id === 'register-confirm-password') {
            this.nextStep();
          }
        } else if (this.registerStep === 3) {
          if (currentElement.id === 'register-affiliation-type') {
            this.$refs.registerAffiliation?.focus();
          } else if (currentElement.id === 'register-affiliation') {
            this.handleRegister();
          }
        }
      }
    },
    
    // Escape 키 처리
    handleEscapeKey() {
      // 이메일 제안 닫기
      if (this.showEmailSuggestions) {
        this.showEmailSuggestions = false;
        this.$refs.registerEmail?.focus();
      }
      
      // 오류 메시지 숨기기
      if (this.error) {
        this.error = '';
      }
    },
    
    // 로그인 필드 유효성 검사
    validateLoginField(field) {
      if (field === 'identifier') {
        if (!this.loginData.identifier) {
          this.loginErrors.identifier = '이메일 또는 전화번호를 입력해주세요.';
        } else {
          // 입력 타입에 따른 유효성 검사
          if (this.currentInputType === 'email') {
            if (!this.isValidEmail(this.loginData.identifier)) {
              this.loginErrors.identifier = '올바른 이메일 형식이 아닙니다.';
            } else {
              this.loginErrors.identifier = '';
            }
          } else if (this.currentInputType === 'phone') {
            if (!this.isValidPhone(this.loginData.identifier)) {
              this.loginErrors.identifier = '올바른 전화번호 형식이 아닙니다.';
            } else {
              this.loginErrors.identifier = '';
            }
          } else {
            // 모호한 상태
            this.loginErrors.identifier = '이메일 또는 전화번호를 입력해주세요.';
          }
        }
      } else if (field === 'password') {
        if (!this.loginData.password) {
          this.loginErrors.password = '비밀번호를 입력해주세요.';
        } else {
          this.loginErrors.password = '';
        }
      }
    },
    
    // 회원가입 필드 유효성 검사
    validateRegisterField(field) {
      if (field === 'name') {
        if (!this.registerData.name) {
          this.registerErrors.name = '이름을 입력해주세요.';
        } else if (this.registerData.name.length < 2) {
          this.registerErrors.name = '이름은 2자 이상 입력해주세요.';
        } else {
          this.registerErrors.name = '';
        }
      } else if (field === 'email') {
        if (!this.registerData.email) {
          this.registerErrors.email = '이메일 주소를 입력해주세요.';
        } else if (!this.isValidEmail(this.registerData.email)) {
          this.registerErrors.email = '올바른 이메일 형식이 아닙니다. (@와 도메인이 포함된 형식으로 입력해주세요)';
        } else {
          this.registerErrors.email = '';
        }
      } else if (field === 'phone') {
        if (!this.registerData.phone) {
          this.registerErrors.phone = '전화번호를 입력해주세요.';
        } else if (!this.isValidPhone(this.registerData.phone)) {
          this.registerErrors.phone = '올바른 전화번호 형식이 아닙니다. (01012345678 형식으로 입력해주세요)';
        } else {
          this.registerErrors.phone = '';
        }
      } else if (field === 'password') {
        if (!this.registerData.password) {
          this.registerErrors.password = '비밀번호를 입력해주세요.';
        } else if (this.registerData.password.length < 6) {
          this.registerErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
        } else {
          this.registerErrors.password = '';
        }
      } else if (field === 'confirmPassword') {
        if (!this.registerData.confirmPassword) {
          this.registerErrors.confirmPassword = '비밀번호를 다시 입력해주세요.';
        } else if (this.registerData.password !== this.registerData.confirmPassword) {
          this.registerErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
        } else {
          this.registerErrors.confirmPassword = '';
        }
      } else if (field === 'affiliationType') {
        if (!this.registerData.affiliationType) {
          this.registerErrors.affiliationType = '소속 유형을 선택해주세요.';
        } else {
          this.registerErrors.affiliationType = '';
        }
      } else if (field === 'affiliation') {
        if (!this.registerData.affiliation) {
          this.registerErrors.affiliation = '소속을 입력해주세요.';
        } else if (this.registerData.affiliation.length < 2) {
          this.registerErrors.affiliation = '소속명은 2자 이상 입력해주세요.';
        } else {
          this.registerErrors.affiliation = '';
        }
      }
    },
    
    // 이메일 유효성 검사
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    
    // 전화번호 유효성 검사
    isValidPhone(phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneRegex = /^01[0-9]{8,9}$/;
      return phoneRegex.test(cleanPhone);
    },
    
    // 입력된 도메인 부분과 가장 일치하는 도메인을 찾습니다.
    findSuggestion(domainPart) {
      if (!domainPart) return null;
      const lowerDomainPart = domainPart.toLowerCase();
      return this.emailDomains.find(domain => domain.startsWith(lowerDomainPart));
    },
    
    // 이메일 입력 처리 (React 방식)
    handleEmailInput(e) {
      const currentUserInput = e.target.value;
      const selectionStart = e.target.selectionStart;
      
      // 현재 입력값에서 '@' 이후 부분을 추출
      const atIndex = currentUserInput.lastIndexOf('@');
      if (atIndex === -1) {
        // '@'가 없으면 제안을 비웁니다.
        this.registerUserInput = currentUserInput;
        this.registerSuggestion = '';
        this.registerData.email = currentUserInput;
        return;
      }
      
      // '@' 이후 부분을 도메인으로 처리
      const domainPart = currentUserInput.slice(atIndex + 1);
      const foundDomain = this.findSuggestion(domainPart);
      
      if (foundDomain && domainPart.length > 0) {
        // 제안이 있으면: userInput은 '@'까지, suggestion은 나머지
        this.registerUserInput = currentUserInput.slice(0, atIndex + 1) + domainPart;
        this.registerSuggestion = foundDomain.substring(domainPart.length);
      } else {
        // 제안이 없으면: 전체를 userInput으로
        this.registerUserInput = currentUserInput;
        this.registerSuggestion = '';
      }
      
      // registerData.email도 업데이트 (유효성 검사용)
      this.registerData.email = this.registerDisplayValue;
      
      // 제안이 있으면 selectionRange 설정
      if (this.registerSuggestion) {
        // 여러 번 시도해서 확실히 설정되도록 함
        setTimeout(() => {
          if (this.$refs.registerEmail) {
            this.$refs.registerEmail.focus();
            this.$refs.registerEmail.setSelectionRange(
              this.registerUserInput.length,
              this.registerDisplayValue.length
            );
            console.log('SelectionRange set 1:', this.registerUserInput.length, this.registerDisplayValue.length);
          }
        }, 10);
        
        setTimeout(() => {
          if (this.$refs.registerEmail) {
            this.$refs.registerEmail.focus();
            this.$refs.registerEmail.setSelectionRange(
              this.registerUserInput.length,
              this.registerDisplayValue.length
            );
            console.log('SelectionRange set 2:', this.registerUserInput.length, this.registerDisplayValue.length);
          }
        }, 50);
        
        // 추가 시도
        setTimeout(() => {
          if (this.$refs.registerEmail) {
            this.$refs.registerEmail.focus();
            this.$refs.registerEmail.setSelectionRange(
              this.registerUserInput.length,
              this.registerDisplayValue.length
            );
            console.log('SelectionRange set 3:', this.registerUserInput.length, this.registerDisplayValue.length);
          }
        }, 100);
        
        // 마지막 시도 - 강제로 value 재설정
        setTimeout(() => {
          if (this.$refs.registerEmail) {
            this.$refs.registerEmail.value = '';
            this.$refs.registerEmail.value = this.registerDisplayValue;
            this.$refs.registerEmail.focus();
            this.$refs.registerEmail.setSelectionRange(
              this.registerUserInput.length,
              this.registerDisplayValue.length
            );
            console.log('SelectionRange set 4 (forced):', this.registerUserInput.length, this.registerDisplayValue.length);
          }
        }, 150);
      }
      
      // 디버깅용 로그 (개발 중에만 사용)
      console.log('Email Input Debug:', {
        currentUserInput,
        selectionStart,
        userInput: this.registerUserInput,
        domainPart,
        suggestion: this.registerSuggestion,
        displayValue: this.registerDisplayValue
      });
    },
    
    // 이메일 키보드 처리 (React 방식)
    handleEmailKeydown(e) {
      console.log('📧 이메일 키보드 처리:', e.key);
      
      // Backspace 키 처리 - 제안이 있을 때 제안을 제거
      if (e.key === 'Backspace' && this.loginSuggestion) {
        console.log('🔙 이메일 Backspace 키 감지 - 제안 제거');
        e.preventDefault();
        
        // 제안을 제거하고 userInput만 유지
        this.loginUserInput = this.loginUserInput.slice(0, -1);
        this.loginSuggestion = '';
        this.loginData.identifier = this.loginUserInput;
        
        // 캐럿을 userInput 끝으로 이동
        this.$nextTick(() => {
          if (this.$refs.loginIdentifier) {
            this.$refs.loginIdentifier.setSelectionRange(
              this.loginUserInput.length,
              this.loginUserInput.length
            );
          }
        });
        return;
      }
      
      // 제안이 있고, 특정 키를 눌렀을 때만 자동완성을 실행
      if ((e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') && this.loginSuggestion) {
        // selection 시작과 끝을 모두 확인하여 조건을 강화
        if (e.target.selectionStart === this.loginUserInput.length && e.target.selectionEnd === this.loginDisplayValue.length) {
          console.log('✅ 이메일 조건 만족 - 제안 수락 시작');
          e.preventDefault(); // 기본 동작(탭 이동 등) 방지
          
          // 제안을 수락: userInput을 전체 제안값으로 업데이트하고, suggestion은 비움
          this.loginUserInput = this.loginDisplayValue;
          this.loginSuggestion = '';
          this.loginData.identifier = this.loginDisplayValue;
          
          console.log('📝 이메일 값 업데이트 완료:', {
            newUserInput: this.loginUserInput,
            newDisplayValue: this.loginDisplayValue
          });
          
          // 선택 상태를 완전히 해제하고 캐럿을 텍스트 맨 뒤로 이동
          this.$nextTick(() => {
            if (this.$refs.loginIdentifier) {
              const fullLength = this.loginDisplayValue.length;
              
              // 캐럿을 맨 뒤로 이동
              this.$refs.loginIdentifier.setSelectionRange(fullLength, fullLength);
            }
          });
          
          // Tab 키인 경우에만 다음 필드로 포커스 이동
          if (e.key === 'Tab') {
            setTimeout(() => {
              console.log('8️⃣ 이메일 Tab 키 - 다음 필드로 포커스 이동');
              this.$refs.loginPassword?.focus();
            }, 100);
          }
        }
      }
    },
    
    // 전화번호 키보드 처리
    handlePhoneKeydown(e) {
      console.log('📞 전화번호 키보드 처리:', e.key);
      
      // 전화번호는 특별한 키보드 처리가 필요 없음
      // 기본 동작 허용
    },
    
    // 모호한 상태 키보드 처리
    handleAmbiguousKeydown(e) {
      console.log('❓ 모호한 상태 키보드 처리:', e.key);
      
      // 기본 동작 허용
    },
    
    // 이메일 포커스 시 제안 표시 (React 방식)
    handleEmailFocus() {
      // 포커스 시 selectionRange 설정
      this.$nextTick(() => {
        if (this.registerSuggestion && this.$refs.registerEmail) {
          this.$refs.registerEmail.setSelectionRange(
            this.registerUserInput.length,
            this.registerDisplayValue.length
          );
        }
      });
    },
    
    // 이메일 블러 시 제안 숨김
    handleEmailBlur() {
      setTimeout(() => {
        this.registerSuggestion = '';
        this.validateRegisterField('email');
      }, 150);
    },
    
    // 전화번호 입력 처리 (자동 포맷팅)
    handlePhoneInput() {
      const phone = this.registerData.phone.replace(/[^0-9]/g, '');
      
      // 전화번호 형식에 따라 포맷팅
      if (phone.length <= 3) {
        this.registerData.phone = phone;
      } else if (phone.length <= 7) {
        this.registerData.phone = `${phone.slice(0, 3)}-${phone.slice(3)}`;
      } else {
        this.registerData.phone = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7, 11)}`;
      }
    },

    // 전화번호 포커스 시 이메일 자동완성 활성화
    handlePhoneFocus() {
      // 이메일 필드에 자동완성 제안이 있다면 수락
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },
    
    // 식별자 타입 감지 (이메일/전화번호만)
    detectIdentifierType() {
      const identifier = this.showRegister ? this.registerData.email : this.loginData.identifier;
      if (!identifier) {
        this.identifierType = '';
        return;
      }
      
      // 이메일 형식 확인
      if (this.isValidEmail(identifier)) {
        this.identifierType = 'email';
        return;
      }
      
      // 전화번호 형식 확인 (한국 전화번호)
      if (this.isValidPhone(identifier)) {
        this.identifierType = 'phone';
        return;
      }
      
      // 기본값
      this.identifierType = '';
    },
    
    // 다음 단계로 이동
    async nextStep() {
      if (this.registerStep === 1) {
        // 1단계에서 다음 단계로 이동할 때만 중복 검사 수행
        if (!this.isStep1Valid) {
          this.showStep1Errors();
          return;
        }
        
        this.isLoading = true;
        this.error = '';
        
        try {
          // 이메일 중복 검사 먼저 수행
          try {
            const emailCheck = await authApi.checkEmailAvailability(this.registerData.email);
            if (emailCheck.data.available === false) {
              this.registerErrors.email = '이미 사용 중인 이메일 주소입니다. 다른 이메일을 사용해주세요.';
              this.error = '';
              this.isLoading = false;
              return;
            } else {
              this.registerErrors.email = '';
            }
          } catch (emailErr) {
            if (emailErr.message.includes('이메일 형식')) {
              this.registerErrors.email = '올바른 이메일 형식이 아닙니다. (@와 도메인이 포함된 형식으로 입력해주세요)';
              this.error = '';
            } else {
              this.registerErrors.email = '이메일 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
              this.error = '';
            }
            this.isLoading = false;
            return;
          }
          
          // 전화번호 중복 검사 수행
          try {
            const cleanPhone = this.registerData.phone.replace(/[^0-9]/g, '');
            const phoneCheck = await authApi.checkPhoneAvailability(cleanPhone);
            if (phoneCheck.data.available === false) {
              this.registerErrors.phone = '이미 사용 중인 전화번호입니다. 다른 전화번호를 사용해주세요.';
              this.error = '';
              this.isLoading = false;
              return;
            } else {
              this.registerErrors.phone = '';
            }
          } catch (phoneErr) {
            if (phoneErr.message.includes('전화번호 형식')) {
              this.registerErrors.phone = '올바른 전화번호 형식이 아닙니다. (01012345678 형식으로 입력해주세요)';
              this.error = '';
            } else {
              this.registerErrors.phone = '전화번호 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
              this.error = '';
            }
            this.isLoading = false;
            return;
          }
          
          // 중복이 없으면 다음 단계로 이동
          this.registerStep = 2;
          this.error = '';
          this.$nextTick(() => {
            this.$refs.registerPassword?.focus();
          });
        } catch (err) {
          this.error = '중복 검사 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } finally {
          this.isLoading = false;
        }
      } else if (this.registerStep === 2 && this.isStep2Valid) {
        this.registerStep = 3;
        this.error = '';
        this.$nextTick(() => {
          this.$refs.registerAffiliationType?.focus();
        });
      }
    },
    
    // 1단계 오류 표시
    showStep1Errors() {
      this.validateRegisterField('name');
      this.validateRegisterField('email');
      this.validateRegisterField('phone');
      
      // 첫 번째 오류 필드로 포커스 이동
      if (this.registerErrors.name) {
        this.$refs.registerName?.focus();
      } else if (this.registerErrors.email) {
        this.$refs.registerEmail?.focus();
      } else if (this.registerErrors.phone) {
        this.$refs.registerPhone?.focus();
      }
      
      // 오류가 있으면 흔들림 애니메이션 트리거
      if (this.registerErrors.name || this.registerErrors.email || this.registerErrors.phone) {
        this.$nextTick(() => {
          const errorElements = document.querySelectorAll('.form-group.has-error');
          errorElements.forEach(element => {
            element.style.animation = 'none';
            element.offsetHeight; // 리플로우 트리거
            element.style.animation = 'shake 0.5s ease-in-out';
          });
        });
      }
    },
    
    // 이전 단계로 이동
    prevStep() {
      if (this.registerStep === 2) {
        this.registerStep = 1;
        this.$nextTick(() => {
          this.$refs.registerName?.focus();
        });
      } else if (this.registerStep === 3) {
        this.registerStep = 2;
        this.$nextTick(() => {
          this.$refs.registerPassword?.focus();
        });
      }
      this.error = '';
    },
    
    // 로그인 처리
    async handleLogin() {
      if (this.isLoading) return;
      
      console.log('🚀 로그인 시작:', {
        identifier: this.loginData.identifier,
        identifierType: this.identifierType
      });
      
      // 유효성 검사
      this.validateLoginField('identifier');
      this.validateLoginField('password');
      
      if (this.loginErrors.identifier || this.loginErrors.password) {
        console.log('❌ 유효성 검사 실패:', this.loginErrors);
        return;
      }
      
      this.isLoading = true;
      this.error = '';
      
      try {
        const loginPayload = {
          identifier: this.loginData.identifier,
          password: this.loginData.password,
          identifierType: this.identifierType
        };
        
        console.log('📤 Store dispatch 시작:', loginPayload);
        await this.$store.dispatch('auth/login', loginPayload);
        console.log('✅ Store dispatch 성공');
        
        // 로그인 성공 후 상태 업데이트가 완료될 때까지 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🎉 로그인 성공 - 이벤트 발생');
        // 로그인 성공 시 이벤트 발생
        this.$emit('login-success');
      } catch (err) {
        console.error('❌ 로그인 실패:', err);
        
        // 친화적인 오류 메시지
        if (err.message.includes('Invalid credentials:')) {
          this.error = '이메일/전화번호 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.';
        } else if (err.message.includes('User not found:')) {
          this.error = '등록되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요.';
        } else if (err.message.includes('Account not approved:')) {
          this.error = '아직 승인되지 않은 계정입니다. 관리자 승인을 기다려주세요.';
        } else if (err.message.includes('Network error:') || err.message.includes('Network')) {
          this.error = '네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검해주세요.';
        } else {
          this.error = '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    // 회원가입 처리
    async handleRegister() {
      if (this.isLoading) return;
      
      console.log('🚀 회원가입 시작:', this.registerData);
      
      // 유효성 검사
      this.validateRegisterField('affiliationType');
      this.validateRegisterField('affiliation');
      
      if (this.registerErrors.affiliationType || this.registerErrors.affiliation) {
        console.log('❌ 유효성 검사 실패:', this.registerErrors);
        return;
      }
      
      this.isLoading = true;
      this.error = '';
      
      try {
        console.log('📤 Store dispatch 시작');
        const result = await this.$store.dispatch('auth/register', this.registerData);
        console.log('✅ Store dispatch 성공:', result);
        
        // 회원가입 성공 시 성공 모달 표시
        this.showRegistrationSuccess = true;
        this.error = '';
        
        console.log('🎉 회원가입 완료 - 성공 모달 표시');
        
        // 폼 초기화는 모달 닫을 때 수행
      } catch (err) {
        console.error('❌ 회원가입 실패:', err);
        
        // 친화적인 오류 메시지
        if (err.message.includes('Email already exists') || err.message.includes('이미 등록된 이메일')) {
          this.error = '이미 사용 중인 이메일 주소입니다. 다른 이메일을 사용해주세요.';
        } else if (err.message.includes('Phone already exists') || err.message.includes('이미 등록된 전화번호')) {
          this.error = '이미 사용 중인 전화번호입니다. 다른 전화번호를 사용해주세요.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          this.error = '네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검해주세요.';
        } else if (err.message.includes('응답 파싱 실패')) {
          this.error = '서버 응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else {
          this.error = `회원가입 중 오류가 발생했습니다: ${err.message}`;
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    // 회원가입 성공 모달 닫기
    closeRegistrationSuccess() {
      this.showRegistrationSuccess = false;
      this.showRegister = false;
      this.registerStep = 1;
      this.resetForms();
      this.$nextTick(() => {
        this.$refs.loginIdentifier?.focus();
      });
    },
    
    // 폼 초기화
    resetForms() {
      this.loginData = { identifier: '', password: '' };
      this.registerData = {
        name: '', email: '', phone: '',
        password: '', confirmPassword: '', affiliation: '', affiliationType: ''
      };
      this.error = '';
      this.identifierType = '';
      this.registerStep = 1;
      
      // 이메일 자동완성 상태 초기화 (React 방식)
      this.loginUserInput = '';
      this.registerUserInput = '';
      this.loginSuggestion = '';
      this.registerSuggestion = '';
      
      // 새로운 입력 타입 감지 시스템 초기화
      this.currentInputType = 'ambiguous';
      this.previousInputType = 'ambiguous';
      this.inputProcessingState = {
        isProcessing: false,
        lastProcessedValue: '',
        modeTransition: false
      };
      
      // 유효성 검사 상태 초기화
      this.loginErrors = { identifier: '', password: '' };
      this.registerErrors = {
        name: '', email: '', phone: '',
        password: '', confirmPassword: '', affiliationType: '', affiliation: ''
      };
    },

    // 이름 필드 포커스 시 이메일 자동완성 활성화
    handleNameFocus() {
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },

    // 비밀번호 필드 포커스 시 이메일 자동완성 활성화
    handlePasswordFocus() {
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },

    // 비밀번호 확인 필드 포커스 시 이메일 자동완성 활성화
    handleConfirmPasswordFocus() {
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },

    // 소속 유형 필드 포커스 시 이메일 자동완성 활성화
    handleAffiliationTypeFocus() {
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },

    // 소속 필드 포커스 시 이메일 자동완성 활성화
    handleAffiliationFocus() {
      if (this.registerSuggestion) {
        this.registerUserInput = this.registerDisplayValue;
        this.registerSuggestion = '';
        this.registerData.email = this.registerDisplayValue;
      }
    },

    // 로그인 식별자 입력 시 자동완성 처리 (통합 시스템)
    handleLoginIdentifierInput(e) {
      const currentUserInput = e.target.value;
      
      // 1단계: 입력 타입 감지
      const detectedType = this.detectInputType(currentUserInput);
      
      // 2단계: 타입 전환 처리
      if (this.currentInputType !== detectedType) {
        this.handleTypeTransition(this.currentInputType, detectedType, currentUserInput);
      }
      
      // 3단계: 타입별 처리
      if (detectedType === 'phone') {
        this.processPhoneInput(currentUserInput);
      } else if (detectedType === 'email') {
        this.processEmailInput(currentUserInput);
      } else {
        this.processAmbiguousInput(currentUserInput);
      }
      
      // 4단계: 상태 업데이트
      this.previousInputType = this.currentInputType;
      this.currentInputType = detectedType;
      this.updateDisplayValue();
    },
    
    // 전화번호 입력 처리
    processPhoneInput(currentInput) {
      console.log('📞 전화번호 처리:', currentInput);
      
      // 전화번호 자동 포맷팅
      const cleanInput = currentInput.replace(/[^0-9]/g, '');
      
      let formattedPhone = cleanInput;
      if (cleanInput.length <= 3) {
        formattedPhone = cleanInput;
      } else if (cleanInput.length <= 7) {
        formattedPhone = `${cleanInput.slice(0, 3)}-${cleanInput.slice(3)}`;
      } else {
        formattedPhone = `${cleanInput.slice(0, 3)}-${cleanInput.slice(3, 7)}-${cleanInput.slice(7, 11)}`;
      }
      
      // 이메일 자동완성 상태 초기화
      this.loginUserInput = formattedPhone;
      this.loginSuggestion = '';
      this.loginData.identifier = formattedPhone;
    },
    
    // 이메일 입력 처리 (기존 로직과 통합)
    processEmailInput(currentInput) {
      console.log('📧 이메일 처리:', currentInput);
      
      // @가 있으면 하이픈 완전 제거 (깔끔한 이메일 주소 보장)
      if (currentInput.includes('@')) {
        currentInput = currentInput.replace(/-/g, '');
      }
      
      // 기존 이메일 자동완성 로직과 통합
      const atIndex = currentInput.lastIndexOf('@');
      
      if (atIndex === -1) {
        // @가 없으면 일반 텍스트로 처리
        this.loginUserInput = currentInput;
        this.loginSuggestion = '';
        this.loginData.identifier = currentInput;
        return;
      }
      
      // @ 이후 도메인 처리
      const domainPart = currentInput.slice(atIndex + 1);
      const foundDomain = this.findSuggestion(domainPart);
      
      if (foundDomain && domainPart.length > 0) {
        // 도메인 제안이 있으면
        this.loginUserInput = currentInput.slice(0, atIndex + 1) + domainPart;
        this.loginSuggestion = foundDomain.substring(domainPart.length);
      } else {
        // 도메인 제안이 없으면
        this.loginUserInput = currentInput;
        this.loginSuggestion = '';
      }
      
      // 최종 값 업데이트
      this.loginData.identifier = this.loginDisplayValue;
      
      // 선택 영역 설정 (기존 로직 유지)
      this.setupEmailSelectionRange();
    },
    
    // 모호한 입력 처리
    processAmbiguousInput(currentInput) {
      console.log('❓ 모호한 입력 처리:', currentInput);
      
      // @가 있으면 하이픈 제거
      if (currentInput.includes('@')) {
        currentInput = currentInput.replace(/-/g, '');
      }
      
      // 그대로 유지
      this.loginUserInput = currentInput;
      this.loginSuggestion = '';
      this.loginData.identifier = currentInput;
    },
    
    // 이메일 선택 영역 설정
    setupEmailSelectionRange() {
      if (this.loginSuggestion) {
        // 여러 번 시도해서 확실히 설정되도록 함
        setTimeout(() => {
          if (this.$refs.loginIdentifier) {
            this.$refs.loginIdentifier.focus();
            this.$refs.loginIdentifier.setSelectionRange(
              this.loginUserInput.length,
              this.loginDisplayValue.length
            );
          }
        }, 10);
        
        setTimeout(() => {
          if (this.$refs.loginIdentifier) {
            this.$refs.loginIdentifier.focus();
            this.$refs.loginIdentifier.setSelectionRange(
              this.loginUserInput.length,
              this.loginDisplayValue.length
            );
          }
        }, 50);
        
        setTimeout(() => {
          if (this.$refs.loginIdentifier) {
            this.$refs.loginIdentifier.focus();
            this.$refs.loginIdentifier.setSelectionRange(
              this.loginUserInput.length,
              this.loginDisplayValue.length
            );
          }
        }, 100);
      }
    },
    
    // 디스플레이 값 업데이트
    updateDisplayValue() {
      // 모든 상태를 동기화
      this.$nextTick(() => {
        // DOM 업데이트 후 선택 영역 설정
        if (this.currentInputType === 'email' && this.loginSuggestion) {
          this.setupEmailSelectionRange();
        }
        
        // 유효성 검사 업데이트
        this.validateLoginField('identifier');
      });
    },
    
    // 새로운 입력 타입 감지 시스템
    detectInputType(input) {
      const cleanInput = input.replace(/[^0-9]/g, '');
      
      // 1순위: @가 있으면 무조건 이메일
      if (input.includes('@')) {
        return 'email';
      }
      
      // 2순위: 완전한 전화번호 (01012345678)
      if (/^01[0-9]{8,9}$/.test(cleanInput)) {
        return 'phone';
      }
      
      // 3순위: 전화번호 시작 패턴 (010, 011, 016 등)
      if (/^01[0-9]/.test(cleanInput) && cleanInput.length >= 3) {
        // 하지만 이메일 시작 패턴이 더 강하면 이메일로 처리
        if (/^[a-zA-Z]/.test(input)) {
          return 'email';
        }
        return 'phone';
      }
      
      // 4순위: 이메일 시작 패턴
      if (/^[a-zA-Z0-9._%+-]+/.test(input)) {
        return 'email';
      }
      
      return 'ambiguous';
    },
    
    // 타입 전환 처리
    handleTypeTransition(fromType, toType, currentInput) {
      console.log(`🔄 타입 전환: ${fromType} → ${toType}`);
      
      // 전화번호 → 이메일 전환
      if (fromType === 'phone' && toType === 'email') {
        this.handlePhoneToEmailTransition(currentInput);
      }
      
      // 이메일 → 전화번호 전환 (드물지만 가능)
      else if (fromType === 'email' && toType === 'phone') {
        this.handleEmailToPhoneTransition(currentInput);
      }
      
      // 모호한 상태에서 명확한 타입으로 전환
      else if (fromType === 'ambiguous') {
        this.handleAmbiguousToSpecificTransition(toType, currentInput);
      }
    },
    
    // 전화번호 → 이메일 전환 처리
    handlePhoneToEmailTransition(currentInput) {
      console.log('📞→📧 전화번호에서 이메일로 전환');
      
      // 1. 전화번호 포맷팅 완전 제거 (하이픈 제거)
      const cleanInput = currentInput.replace(/-/g, '');
      
      // 2. @ 위치 찾기
      const atIndex = cleanInput.indexOf('@');
      
      if (atIndex > 0) {
        // 3. @ 이후 부분 추출
        const emailPart = cleanInput.slice(atIndex);
        
        // 4. 이메일 자동완성 시작 (하이픈 없이 깔끔하게)
        this.loginUserInput = emailPart;
        this.loginSuggestion = '';
        
        // 5. 도메인 제안 처리
        this.processEmailDomainSuggestion(emailPart);
      }
    },
    
    // 이메일 → 전화번호 전환 처리
    handleEmailToPhoneTransition(currentInput) {
      console.log('📧→📞 이메일에서 전화번호로 전환');
      
      // @ 제거하고 숫자만 추출
      const cleanInput = currentInput.replace(/[^0-9]/g, '');
      
      if (/^01[0-9]/.test(cleanInput)) {
        this.processPhoneInput(cleanInput);
      }
    },
    
    // 모호한 상태에서 명확한 타입으로 전환
    handleAmbiguousToSpecificTransition(toType, currentInput) {
      console.log(`❓→${toType === 'phone' ? '📞' : '📧'} 모호한 상태에서 ${toType}로 전환`);
      
      if (toType === 'phone') {
        this.processPhoneInput(currentInput);
      } else if (toType === 'email') {
        this.processEmailInput(currentInput);
      }
    },
    
    // 이메일 도메인 제안 처리
    processEmailDomainSuggestion(emailPart) {
      const atIndex = emailPart.lastIndexOf('@');
      if (atIndex === -1) return;
      
      const domainPart = emailPart.slice(atIndex + 1);
      const foundDomain = this.findSuggestion(domainPart);
      
      if (foundDomain && domainPart.length > 0) {
        this.loginUserInput = emailPart.slice(0, atIndex + 1) + domainPart;
        this.loginSuggestion = foundDomain.substring(domainPart.length);
      } else {
        this.loginUserInput = emailPart;
        this.loginSuggestion = '';
      }
      
      this.loginData.identifier = this.loginDisplayValue;
    }
  }
};
</script>

<style scoped>
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
}

.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.app-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.app-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.tab-navigation {
  display: flex;
  margin-bottom: 32px;
  border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tab-btn.active {
  color: #4285f4;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #4285f4;
}

.auth-form {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 단계 표시기 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  background: #e0e0e0;
  color: #666;
  transition: all 0.3s ease;
}

.step-number.active {
  background: #4285f4;
  color: white;
}

.step-number.completed {
  background: #34a853;
  color: white;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #e0e0e0;
  margin: 0 16px;
}

.step-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.form-group.has-error {
  animation: shake 0.5s ease-in-out;
}

.form-group.has-error input,
.form-group.has-error select {
  border-color: #f44336;
  background-color: #ffebee;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}

.form-group.has-error input:focus,
.form-group.has-error select:focus {
  border-color: #f44336;
  background-color: #ffebee;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
}

.form-group:not(.has-error) input:not(:placeholder-shown):valid,
.form-group:not(.has-error) select:not([value=""]) {
  border-color: #4caf50;
  background-color: #e8f5e8;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-group:not(.has-error) input:not(:placeholder-shown):valid:focus,
.form-group:not(.has-error) select:not([value=""]):focus {
  border-color: #4caf50;
  background-color: #e8f5e8;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.form-group.has-error label {
  color: #f44336;
}

.form-group.success label {
  color: #4caf50;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.input-container {
  position: relative;
}

.error-icon, .success-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-size: 20px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 2;
}

.error-icon {
  color: #f44336;
}

.success-icon {
  color: #4caf50;
}

.form-group.has-error .error-icon {
  opacity: 1;
}

.form-group:not(.has-error) .success-icon {
  opacity: 1;
}

/* 이메일 필드의 아이콘 위치 조정 */
.email-input-container .error-icon,
.email-input-container .success-icon {
  right: 12px;
}

/* 일반 입력 필드의 아이콘 위치 조정 */
.input-container .error-icon,
.input-container .success-icon {
  right: 12px;
}

/* 비밀번호 입력 필드의 아이콘 위치 조정 */
.password-input-container .error-icon,
.password-input-container .success-icon {
  right: 40px; /* password-toggle 버튼과 겹치지 않도록 조정 */
}

.email-input-container {
  position: relative;
}



.password-input-container {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
  z-index: 3;
}

.password-toggle:hover {
  color: #4285f4;
}

.password-toggle.shifted {
  right: 40px;
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form-help {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.form-help-section {
  margin-bottom: 20px;
  text-align: center;
}

.form-help-section .form-help {
  margin-top: 0;
}

.form-error {
  display: block;
  font-size: 12px;
  color: #d93025;
  margin-top: 4px;
  animation: fadeIn 0.3s ease;
}

.error-message {
  background: #fce8e6;
  color: #d93025;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
  border: 1px solid #fad2cf;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.error-message .material-icons {
  font-size: 20px;
}

.form-actions {
  margin-top: 32px;
  display: flex;
  gap: 12px;
}

.primary-btn {
  flex: 1;
  padding: 14px 24px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
}

.primary-btn:hover:not(:disabled) {
  background: #3367d6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}

.primary-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.secondary-btn {
  flex: 1;
  padding: 14px 24px;
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.secondary-btn:hover:not(:disabled) {
  background: #f1f3f4;
  border-color: #c4c7c5;
}

.secondary-btn:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.5;
}

.material-icons {
  font-size: 20px;
}

.loading-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 애니메이션 */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-fade-enter, .slide-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.step-transition-enter-active, .step-transition-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.step-transition-enter, .step-transition-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 포커스 스타일 */
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.form-group.has-error input:focus,
.form-group.has-error select:focus {
  border-color: #f44336;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}

/* 접근성 개선 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 커스텀 드롭다운 스타일 */
.custom-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

.custom-select:focus {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234285f4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
}

/* 드롭다운에서 체크 아이콘 위치 조정 */
.form-group .input-container select + .success-icon {
  right: 40px; /* 기본 화살표 공간 확보 */
}

.form-group .input-container select + .error-icon {
  right: 40px; /* 기본 화살표 공간 확보 */
}

/* 반응형 디자인 */
@media (max-width: 480px) {
  .auth-container {
    padding: 24px;
    margin: 16px;
  }
  
  .app-title {
    font-size: 24px;
  }
  
  .form-group input,
  .form-group select {
    font-size: 16px; /* iOS에서 줌 방지 */
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .error-message {
    font-size: 13px;
    padding: 10px 14px;
  }
}

/* 회원가입 성공 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.success-icon-large {
  margin-bottom: 24px;
}

.success-icon-large .material-icons {
  font-size: 64px;
  color: #4caf50;
}

.modal-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.modal-message {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 32px;
}

.modal-message strong {
  color: #1a1a1a;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: center;
}

.modal-actions .primary-btn {
  min-width: 120px;
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(-20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

/* 비밀번호 입력 필드의 아이콘 위치 조정 */
.password-input-container .error-icon,
.password-input-container .success-icon {
  right: 12px; /* password-toggle이 shifted 상태일 때 40px로 이동하므로 아이콘은 12px에 위치 */
}

/* 새로운 입력 타입 감지 시스템 스타일 */
.input-field {
  transition: all 0.3s ease;
}

.input-field.phone-mode {
  border-color: #4285f4;
  background-color: #e3f2fd;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.input-field.phone-mode:focus {
  border-color: #4285f4;
  background-color: #e3f2fd;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2);
}

.input-field.email-mode {
  border-color: #9c27b0;
  background-color: #f3e5f5;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.input-field.email-mode:focus {
  border-color: #9c27b0;
  background-color: #f3e5f5;
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.input-field.ambiguous-mode {
  border-color: #ddd;
  background-color: #fff;
}

.input-field.has-suggestion {
  border-color: #4caf50;
  background-color: #e8f5e8;
}

/* 입력 타입 표시 아이콘 */
.input-container {
  position: relative;
}

.input-container::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.6;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.input-field.phone-mode + .input-container::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234285f4'%3E%3Cpath d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'/%3E%3C/svg%3E");
}

.input-field.email-mode + .input-container::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239c27b0'%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'/%3E%3C/svg%3E");
}

/* 입력 타입 전환 애니메이션 */
@keyframes typeTransition {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.input-field.phone-mode,
.input-field.email-mode {
  animation: typeTransition 0.3s ease;
}

/* 모드 전환 시 부드러운 색상 변화 */
.input-field {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 제안 텍스트 스타일 강화 */
.input-field.has-suggestion {
  position: relative;
}

.input-field.has-suggestion::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(76, 175, 80, 0.1) 100%);
  pointer-events: none;
  border-radius: 8px;
}
</style> 