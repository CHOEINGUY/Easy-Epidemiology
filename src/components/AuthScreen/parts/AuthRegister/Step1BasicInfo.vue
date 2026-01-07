<template>
  <div class="register-step">
    <StepIndicator :current-step="1" :total-steps="3" />
    <h3 class="step-title">기본 정보 입력</h3>
    
    <form @submit.prevent="handleSubmit" class="register-form">
      <!-- 이름 -->
      <div class="form-group" :class="{ 'has-error': errors.name, 'success': formData.name && !errors.name }">
        <label for="register-name">이름</label>
        <div class="input-container">
          <input
            id="register-name"
            v-model="formData.name"
            type="text"
            placeholder="실명을 입력하세요"
            required
            :disabled="isLoading"
            maxlength="50"
            @blur="validateField('name')"
            ref="nameInput"
          />
          <span v-if="errors.name" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.name && !errors.name" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.name" class="form-error">{{ errors.name }}</small>
      </div>
      
      <!-- 이메일 -->
      <div class="form-group" :class="{ 'has-error': errors.email, 'success': formData.email && !errors.email }">
        <label for="register-email">이메일 주소</label>
        <div class="input-container">
          <input
            id="register-email"
            :value="displayValue"
            type="text"
            placeholder="이메일 주소를 입력하세요"
            required
            :disabled="isLoading"
            @input="handleEmailInput"
            @keydown="handleEmailKeydown"
            @blur="handleEmailBlur"
            ref="emailInput"
            autocomplete="off"
            class="input-field email-mode"
          />
          <span v-if="errors.email" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.email && !errors.email" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.email" class="form-error">{{ errors.email }}</small>
      </div>
      
      <!-- 전화번호 -->
      <div class="form-group" :class="{ 'has-error': errors.phone, 'success': formData.phone && !errors.phone }">
        <label for="register-phone">전화번호</label>
        <div class="input-container">
          <input
            id="register-phone"
            v-model="formData.phone"
            type="tel"
            placeholder="전화번호를 입력하세요 (예: 01012345678)"
            required
            :disabled="isLoading"
            @input="handlePhoneInput"
            @blur="validateField('phone')"
            maxlength="13"
            ref="phoneInput"
            class="input-field phone-mode"
          />
          <span v-if="errors.phone" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.phone && !errors.phone" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.phone" class="form-error">{{ errors.phone }}</small>
      </div>
      
      <div class="form-help-section">
        <small class="form-help">이메일 또는 전화번호로 로그인할 수 있습니다.</small>
      </div>
      
      <div v-if="localError" class="error-message" role="alert">
        <span class="material-icons">warning</span>
        {{ localError }}
      </div>
      
      <div class="form-actions">
        <button 
          type="submit" 
          class="primary-btn"
          :disabled="isLoading || !formData.name || !formData.email || !formData.phone"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-if="isLoading">확인 중...</span>
          <template v-else>
            <span>다음 단계</span>
            <span class="material-icons btn-icon">arrow_forward</span>
          </template>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import StepIndicator from './StepIndicator.vue';
import { 
  isValidEmail, 
  isValidPhone, 
  findEmailSuggestion,
  formatPhoneNumber
} from '../../logic/inputHandlers';

export default {
  name: 'Step1BasicInfo',
  components: { StepIndicator },
  props: {
    isLoading: { type: Boolean, default: false },
    initialData: { type: Object, default: () => ({}) }
  },
  emits: ['next', 'update:data'],
  data() {
    return {
      formData: {
        name: this.initialData.name || '',
        email: this.initialData.email || '',
        phone: this.initialData.phone || ''
      },
      errors: { name: '', email: '', phone: '' },
      localError: '',
      userInput: '',
      suggestion: ''
    };
  },
  computed: {
    displayValue() {
      return this.userInput + this.suggestion;
    }
  },
  watch: {
    formData: {
      deep: true,
      handler(val) {
        this.$emit('update:data', val);
      }
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.nameInput?.focus());
  },
  methods: {
    validateField(field) {
      if (field === 'name') {
        if (!this.formData.name) this.errors.name = '이름을 입력해주세요.';
        else if (this.formData.name.length < 2) this.errors.name = '이름은 2자 이상 입력해주세요.';
        else this.errors.name = '';
      } else if (field === 'email') {
        if (!this.formData.email) this.errors.email = '이메일 주소를 입력해주세요.';
        else if (!isValidEmail(this.formData.email)) this.errors.email = '올바른 이메일 형식이 아닙니다.';
        else this.errors.email = '';
      } else if (field === 'phone') {
        if (!this.formData.phone) this.errors.phone = '전화번호를 입력해주세요.';
        else if (!isValidPhone(this.formData.phone)) this.errors.phone = '올바른 전화번호 형식이 아닙니다.';
        else this.errors.phone = '';
      }
    },
    
    handleEmailInput(e) {
      const input = e.target.value;
      const atIndex = input.lastIndexOf('@');
      
      if (atIndex === -1) {
        this.userInput = input;
        this.suggestion = '';
        this.formData.email = input;
        return;
      }
      
      const domainPart = input.slice(atIndex + 1);
      const foundDomain = findEmailSuggestion(domainPart);
      
      if (foundDomain && domainPart.length > 0) {
        this.userInput = input.slice(0, atIndex + 1) + domainPart;
        this.suggestion = foundDomain.substring(domainPart.length);
      } else {
        this.userInput = input;
        this.suggestion = '';
      }
      
      this.formData.email = this.displayValue;
      this.localError = '';
      if (this.errors.email) this.validateField('email');
      
      this.$nextTick(() => {
        if (this.suggestion && this.$refs.emailInput) {
          this.$refs.emailInput.setSelectionRange(this.userInput.length, this.displayValue.length);
        }
      });
    },
    
    handleEmailKeydown(e) {
      if (e.key === 'Backspace' && this.suggestion) {
        e.preventDefault();
        this.userInput = this.userInput.slice(0, -1);
        this.suggestion = '';
        this.formData.email = this.userInput;
        return;
      }
      
      if ((e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') && this.suggestion) {
        if (e.target.selectionStart === this.userInput.length) {
          e.preventDefault();
          this.userInput = this.displayValue;
          this.suggestion = '';
          this.formData.email = this.displayValue;
          
          if (e.key === 'Tab') {
            setTimeout(() => this.$refs.phoneInput?.focus(), 100);
          }
        }
      }
    },
    
    handleEmailBlur() {
      setTimeout(() => {
        this.suggestion = '';
        this.validateField('email');
      }, 150);
    },
    
    handlePhoneInput(e) {
      const formatted = formatPhoneNumber(e.target.value);
      this.formData.phone = formatted;
      this.localError = '';
      if (this.errors.phone) this.validateField('phone');
    },
    
    handleSubmit() {
      this.validateField('name');
      this.validateField('email');
      this.validateField('phone');
      
      if (this.errors.name || this.errors.email || this.errors.phone) return;
      
      this.$emit('next', this.formData);
    },
    
    setError(field, message) {
      if (field === 'local') {
        this.localError = message;
      } else {
        this.errors[field] = message;
      }
    }
  }
};
</script>

<style scoped>
@import './register-shared.css';
</style>
