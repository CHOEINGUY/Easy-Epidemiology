<template>
  <div class="register-step">
    <StepIndicator :current-step="2" :total-steps="3" />
    <h3 class="step-title">비밀번호 설정</h3>
    
    <form @submit.prevent="handleSubmit" class="register-form">
      <!-- 비밀번호 -->
      <div class="form-group" :class="{ 'has-error': errors.password, 'success': formData.password && !errors.password }">
        <label for="register-password">비밀번호</label>
        <div class="password-input-container">
          <input
            id="register-password"
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="8자 이상의 안전한 비밀번호를 입력하세요"
            required
            :disabled="isLoading"
            @blur="validateField('password')"
            ref="passwordInput"
          />
          <button
            type="button"
            class="password-toggle"
            :class="{ 'shifted': formData.password }"
            @click="showPassword = !showPassword"
            tabindex="0"
          >
            <span class="material-icons">
              {{ showPassword ? 'visibility' : 'visibility_off' }}
            </span>
          </button>
          <span v-if="errors.password" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.password && !errors.password" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.password" class="form-error">{{ errors.password }}</small>
      </div>
      
      <!-- 비밀번호 확인 -->
      <div class="form-group" :class="{ 'has-error': errors.confirmPassword, 'success': formData.confirmPassword && !errors.confirmPassword }">
        <label for="register-confirm-password">비밀번호 확인</label>
        <div class="password-input-container">
          <input
            id="register-confirm-password"
            v-model="formData.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="비밀번호를 다시 입력하세요"
            required
            :disabled="isLoading"
            @blur="validateField('confirmPassword')"
            ref="confirmPasswordInput"
          />
          <button
            type="button"
            class="password-toggle"
            :class="{ 'shifted': formData.confirmPassword }"
            @click="showConfirmPassword = !showConfirmPassword"
            tabindex="0"
          >
            <span class="material-icons">
              {{ showConfirmPassword ? 'visibility' : 'visibility_off' }}
            </span>
          </button>
          <span v-if="errors.confirmPassword" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.confirmPassword && !errors.confirmPassword" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</small>
      </div>
      
      <div class="form-actions">
        <button 
          type="button" 
          class="secondary-btn"
          @click="$emit('prev')"
          :disabled="isLoading"
        >
          이전 단계
        </button>
        <button 
          type="submit" 
          class="primary-btn"
          :disabled="isLoading || !formData.password || !formData.confirmPassword"
        >
          <span>다음 단계</span>
          <span class="material-icons btn-icon">arrow_forward</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import StepIndicator from './StepIndicator.vue';

export default {
  name: 'Step2Password',
  components: { StepIndicator },
  props: {
    isLoading: { type: Boolean, default: false },
    initialData: { type: Object, default: () => ({}) }
  },
  emits: ['next', 'prev', 'update:data'],
  data() {
    return {
      formData: {
        password: this.initialData.password || '',
        confirmPassword: this.initialData.confirmPassword || ''
      },
      errors: { password: '', confirmPassword: '' },
      showPassword: false,
      showConfirmPassword: false
    };
  },
  watch: {
    formData: {
      deep: true,
      handler(val) {
        this.$emit('update:data', val);
      }
    },
    'formData.password'() {
      if (this.errors.password) this.validateField('password');
      if (this.errors.confirmPassword) this.validateField('confirmPassword');
    },
    'formData.confirmPassword'() {
      if (this.errors.confirmPassword) this.validateField('confirmPassword');
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.passwordInput?.focus());
  },
  methods: {
    validateField(field) {
      if (field === 'password') {
        if (!this.formData.password) this.errors.password = '비밀번호를 입력해주세요.';
        else if (this.formData.password.length < 6) this.errors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
        else this.errors.password = '';
      } else if (field === 'confirmPassword') {
        if (!this.formData.confirmPassword) this.errors.confirmPassword = '비밀번호를 다시 입력해주세요.';
        else if (this.formData.password !== this.formData.confirmPassword) this.errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
        else this.errors.confirmPassword = '';
      }
    },
    
    handleSubmit() {
      this.validateField('password');
      this.validateField('confirmPassword');
      
      if (this.errors.password || this.errors.confirmPassword) return;
      
      this.$emit('next', this.formData);
    }
  }
};
</script>

<style scoped>
@import './register-shared.css';
</style>
