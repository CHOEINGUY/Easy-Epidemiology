<template>
  <div class="auth-form">
    <transition name="step-transition" mode="out-in">
      <!-- Step 1: Basic Info -->
      <Step1BasicInfo
        v-if="currentStep === 1"
        key="step1"
        :is-loading="isChecking"
        :initial-data="formData"
        @next="handleStep1Next"
        @update:data="updateFormData"
        ref="step1"
      />
      
      <!-- Step 2: Password -->
      <Step2Password
        v-else-if="currentStep === 2"
        key="step2"
        :is-loading="isLoading"
        :initial-data="formData"
        @next="handleStep2Next"
        @prev="currentStep = 1"
        @update:data="updateFormData"
      />
      
      <!-- Step 3: Affiliation -->
      <Step3Affiliation
        v-else-if="currentStep === 3"
        key="step3"
        :is-loading="isLoading"
        :error="error"
        :initial-data="formData"
        @submit="handleSubmit"
        @prev="currentStep = 2"
        @update:data="updateFormData"
      />
    </transition>
  </div>
</template>

<script>
import { authApi } from '../../../../services/authApi';
import Step1BasicInfo from './Step1BasicInfo.vue';
import Step2Password from './Step2Password.vue';
import Step3Affiliation from './Step3Affiliation.vue';

export default {
  name: 'AuthRegister',
  components: {
    Step1BasicInfo,
    Step2Password,
    Step3Affiliation
  },
  props: {
    isLoading: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  emits: ['register', 'update:error'],
  data() {
    return {
      currentStep: 1,
      isChecking: false,
      formData: {
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
  watch: {
    '$store.state.auth.isAuthenticated'(newValue, oldValue) {
      if (oldValue === true && newValue === false) {
        this.resetForm();
      }
    }
  },
  methods: {
    updateFormData(data) {
      this.formData = { ...this.formData, ...data };
    },
    
    async handleStep1Next(data) {
      this.updateFormData(data);
      this.isChecking = true;
      this.$emit('update:error', '');
      
      try {
        // Check Email availability
        try {
          const emailCheck = await authApi.checkEmailAvailability(this.formData.email);
          if (emailCheck.data?.available === false) {
            this.$refs.step1?.setError('email', '이미 사용 중인 이메일 주소입니다.');
            this.isChecking = false;
            return;
          }
        } catch (e) {
          this.$refs.step1?.setError('local', '이메일 확인 중 오류가 발생했습니다.');
          this.isChecking = false;
          return;
        }
        
        // Check Phone availability
        try {
          const cleanPhone = this.formData.phone.replace(/[^0-9]/g, '');
          const phoneCheck = await authApi.checkPhoneAvailability(cleanPhone);
          if (phoneCheck.data?.available === false) {
            this.$refs.step1?.setError('phone', '이미 사용 중인 전화번호입니다.');
            this.isChecking = false;
            return;
          }
        } catch (e) {
          this.$refs.step1?.setError('local', '전화번호 확인 중 오류가 발생했습니다.');
          this.isChecking = false;
          return;
        }
        
        this.currentStep = 2;
      } catch (err) {
        this.$refs.step1?.setError('local', '확인 중 오류가 발생했습니다.');
      } finally {
        this.isChecking = false;
      }
    },
    
    handleStep2Next(data) {
      this.updateFormData(data);
      this.currentStep = 3;
    },
    
    handleSubmit(data) {
      this.updateFormData(data);
      this.$emit('register', this.formData);
    },
    
    resetForm() {
      this.currentStep = 1;
      this.formData = {
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        affiliationType: '',
        affiliation: ''
      };
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

/* Step Transition */
.step-transition-enter-active,
.step-transition-leave-active {
  transition: all 0.3s ease;
}

.step-transition-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-transition-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
