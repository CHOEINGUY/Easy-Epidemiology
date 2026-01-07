<template>
  <div class="auth-form">
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
            @click="showLoginPassword = !showLoginPassword"
            :disabled="isLoading"
            tabindex="0"
          >
            <span class="material-icons">
              {{ showLoginPassword ? 'visibility' : 'visibility_off' }}
            </span>
          </button>
          <span v-if="loginErrors.password" class="error-icon password-error">
            <span class="material-icons">error</span>
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
          <template v-else>
            <span class="material-icons btn-icon">arrow_forward</span>
            <span>로그인</span>
          </template>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { 
  isValidEmail, 
  isValidPhone, 
  detectInputType, 
  findEmailSuggestion,
  formatPhoneNumber
} from '../logic/inputHandlers';

export default {
  name: 'AuthLogin',
  props: {
    isLoading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loginData: {
        identifier: '',
        password: ''
      },
      showLoginPassword: false,
      
      // Auto-completion state
      loginUserInput: '',
      loginSuggestion: '',
      
      // Input type detection
      currentInputType: 'ambiguous', // 'phone', 'email', 'ambiguous'
      previousInputType: 'ambiguous',
      identifierType: '',
      
      loginErrors: {
        identifier: '',
        password: ''
      }
    };
  },
  computed: {
    loginDisplayValue() {
      return this.loginUserInput + this.loginSuggestion;
    },
    inputFieldClass() {
      return {
        'input-field': true,
        'phone-mode': this.currentInputType === 'phone',
        'email-mode': this.currentInputType === 'email',
        'ambiguous-mode': this.currentInputType === 'ambiguous',
        'has-suggestion': !!this.loginSuggestion
      };
    },
    placeholderText() {
      switch (this.currentInputType) {
      case 'phone':
        return '전화번호를 입력하세요 (예: 01012345678)';
      case 'email':
        return '이메일 주소를 입력하세요';
      default:
        return '이메일 또는 전화번호를 입력하세요';
      }
    }
  },
  watch: {
    'loginData.password'() {
      if (this.loginErrors.password) {
        this.validateLoginField('password');
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.loginIdentifier?.focus();
    });
  },
  methods: {
    handleKeydown(event) {
      if (this.isLoading) return;
      
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.target.id === 'login-password') {
          this.handleLogin();
        }
      }
    },
    
    handleLoginIdentifierKeydown(e) {
      // Backspace: Remove suggestion if exists
      if (e.key === 'Backspace' && this.loginSuggestion) {
        e.preventDefault();
        this.loginUserInput = this.loginUserInput.slice(0, -1);
        this.loginSuggestion = '';
        this.loginData.identifier = this.loginUserInput;
        
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
      
      // Accept suggestion on Tab, Enter, ArrowRight
      if ((e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') && this.loginSuggestion) {
        // Only if cursor is at the end of user input
        if (e.target.selectionStart === this.loginUserInput.length) {
          e.preventDefault();
          this.loginUserInput = this.loginDisplayValue;
          this.loginSuggestion = '';
          this.loginData.identifier = this.loginDisplayValue;
          
          this.$nextTick(() => {
            if (this.$refs.loginIdentifier) {
              const fullLength = this.loginDisplayValue.length;
              this.$refs.loginIdentifier.setSelectionRange(fullLength, fullLength);
            }
          });
          
          if (e.key === 'Tab') {
            setTimeout(() => {
              this.$refs.loginPassword?.focus();
            }, 100);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.$refs.loginPassword?.focus();
      }
    },
    
    handleLoginIdentifierInput(e) {
      const currentUserInput = e.target.value;
      
      // 1. Detect type
      const detectedType = detectInputType(currentUserInput);
      
      // 2. Process based on type
      if (detectedType === 'phone') {
        this.processPhoneInput(currentUserInput);
      } else if (detectedType === 'email') {
        this.processEmailInput(currentUserInput);
      } else {
        this.processAmbiguousInput(currentUserInput);
      }
      
      // 3. Update state
      this.previousInputType = this.currentInputType;
      this.currentInputType = detectedType;
      
      // 4. Update validation
      this.$nextTick(() => {
        if (this.currentInputType === 'email' && this.loginSuggestion) {
          this.setupEmailSelectionRange();
        }
        if (this.loginErrors.identifier) {
          this.validateLoginField('identifier');
        }
      });
    },
    
    processPhoneInput(currentInput) {
      const formatted = formatPhoneNumber(currentInput);
      this.loginUserInput = formatted;
      this.loginSuggestion = '';
      this.loginData.identifier = formatted;
      this.identifierType = 'phone';
    },
    
    processEmailInput(currentInput) {
      if (currentInput.includes('@')) {
        currentInput = currentInput.replace(/-/g, '');
      }
      
      const atIndex = currentInput.lastIndexOf('@');
      
      if (atIndex === -1) {
        this.loginUserInput = currentInput;
        this.loginSuggestion = '';
        this.loginData.identifier = currentInput;
        return;
      }
      
      const domainPart = currentInput.slice(atIndex + 1);
      const foundDomain = findEmailSuggestion(domainPart);
      
      if (foundDomain && domainPart.length > 0) {
        this.loginUserInput = currentInput.slice(0, atIndex + 1) + domainPart;
        this.loginSuggestion = foundDomain.substring(domainPart.length);
      } else {
        this.loginUserInput = currentInput;
        this.loginSuggestion = '';
      }
      
      this.loginData.identifier = this.loginDisplayValue;
      this.identifierType = 'email';
      
      this.setupEmailSelectionRange();
    },
    
    processAmbiguousInput(currentInput) {
      if (currentInput.includes('@')) {
        currentInput = currentInput.replace(/-/g, '');
      }
      this.loginUserInput = currentInput;
      this.loginSuggestion = '';
      this.loginData.identifier = currentInput;
      this.identifierType = '';
    },
    
    setupEmailSelectionRange() {
      if (this.loginSuggestion) {
        // Multiple attempts to ensure selection is set after DOM update
        [10, 50, 100].forEach(delay => {
          setTimeout(() => {
            if (this.$refs.loginIdentifier) {
              this.$refs.loginIdentifier.setSelectionRange(
                this.loginUserInput.length,
                this.loginDisplayValue.length
              );
            }
          }, delay);
        });
      }
    },
    
    validateLoginField(field) {
      if (field === 'identifier') {
        if (!this.loginData.identifier) {
          this.loginErrors.identifier = '이메일 또는 전화번호를 입력해주세요.';
        } else {
          if (this.currentInputType === 'email') {
            if (!isValidEmail(this.loginData.identifier)) {
              this.loginErrors.identifier = '올바른 이메일 형식이 아닙니다.';
            } else {
              this.loginErrors.identifier = '';
            }
          } else if (this.currentInputType === 'phone') {
            if (!isValidPhone(this.loginData.identifier)) {
              this.loginErrors.identifier = '올바른 전화번호 형식이 아닙니다.';
            } else {
              this.loginErrors.identifier = '';
            }
          } else {
            // Ambiguous
            this.loginErrors.identifier = '';
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
    
    handleLogin() {
      this.validateLoginField('identifier');
      this.validateLoginField('password');
      
      if (this.loginErrors.identifier || this.loginErrors.password) {
        return;
      }
      
      this.$emit('login', {
        identifier: this.loginData.identifier,
        password: this.loginData.password,
        identifierType: this.identifierType
      });
    }
  }
};
</script>

<style scoped>
.auth-form {
  animation: fadeUp 0.8s ease-out 0.4s backwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-group {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.form-group.has-error input {
  border-color: #f44336;
  background-color: #fef2f2;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.08);
}

.form-group.has-error input:focus {
  border-color: #f44336;
  box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.12);
}

.form-group:not(.has-error) input:not(:placeholder-shown):valid {
  border-color: #10b981;
  background-color: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}

.form-group:not(.has-error) input:not(:placeholder-shown):valid:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  background: #f8fafc;
}

.form-group input::placeholder {
  color: #94a3b8;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.input-container, .password-input-container {
  position: relative;
}

.error-icon, .success-icon {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  font-size: 20px;
  opacity: 1;
  z-index: 2;
}

.error-icon { color: #f44336; }
.success-icon { color: #10b981; }

.password-input-container .error-icon,
.password-input-container .success-icon {
  right: 48px;
}

.password-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  z-index: 3;
}

.password-toggle:hover { 
  color: #3b82f6; 
  background: rgba(59, 130, 246, 0.08);
}
.password-toggle.shifted { right: 48px; }

.form-error {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  font-weight: 500;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-actions {
  margin-top: 28px;
}

/* Modern SaaS Primary Button - from HeroSection */
.primary-btn {
  width: 100%;
  padding: 16px 24px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-btn:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
}

.primary-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.2);
}

.primary-btn:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 18px;
  transition: transform 0.2s ease;
}

.primary-btn:hover:not(:disabled) .btn-icon {
  transform: translateX(3px);
}

.loading-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.material-icons { font-size: 20px; }

/* Input Modes */
.input-field.phone-mode {
  border-color: #3b82f6;
  background-color: #eff6ff;
}
.input-field.phone-mode:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.input-field.email-mode {
  border-color: #8b5cf6;
  background-color: #f5f3ff;
}
.input-field.email-mode:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
}
</style>
