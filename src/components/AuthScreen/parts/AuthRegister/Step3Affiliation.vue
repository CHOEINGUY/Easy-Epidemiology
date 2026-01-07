<template>
  <div class="register-step">
    <StepIndicator :current-step="3" :total-steps="3" />
    <h3 class="step-title">소속 정보 입력</h3>
    
    <form @submit.prevent="handleSubmit" class="register-form">
      <!-- 소속 유형 -->
      <div class="form-group" :class="{ 'has-error': errors.affiliationType, 'success': formData.affiliationType && !errors.affiliationType }">
        <label for="register-affiliation-type">소속 유형</label>
        <div class="input-container">
          <select
            id="register-affiliation-type"
            v-model="formData.affiliationType"
            required
            :disabled="isLoading"
            @blur="validateField('affiliationType')"
            ref="affiliationTypeInput"
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
          <span v-if="errors.affiliationType" class="error-icon select-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.affiliationType && !errors.affiliationType" class="success-icon select-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.affiliationType" class="form-error">{{ errors.affiliationType }}</small>
      </div>
      
      <!-- 소속명 -->
      <div class="form-group" :class="{ 'has-error': errors.affiliation, 'success': formData.affiliation && !errors.affiliation }">
        <label for="register-affiliation">소속명</label>
        <div class="input-container">
          <input
            id="register-affiliation"
            v-model="formData.affiliation"
            type="text"
            placeholder="소속 기관명을 입력하세요"
            required
            :disabled="isLoading"
            @blur="validateField('affiliation')"
            ref="affiliationInput"
          />
          <span v-if="errors.affiliation" class="error-icon">
            <span class="material-icons">error</span>
          </span>
          <span v-else-if="formData.affiliation && !errors.affiliation" class="success-icon">
            <span class="material-icons">check_circle</span>
          </span>
        </div>
        <small v-if="errors.affiliation" class="form-error">{{ errors.affiliation }}</small>
      </div>
      
      <div v-if="error" class="error-message" role="alert">
        <span class="material-icons">warning</span>
        {{ error }}
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
          :disabled="isLoading || !formData.affiliationType || !formData.affiliation"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-if="isLoading">회원가입 중...</span>
          <template v-else>
            <span class="material-icons btn-icon">check</span>
            <span>회원가입 완료</span>
          </template>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import StepIndicator from './StepIndicator.vue';

export default {
  name: 'Step3Affiliation',
  components: { StepIndicator },
  props: {
    isLoading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    initialData: { type: Object, default: () => ({}) }
  },
  emits: ['submit', 'prev', 'update:data'],
  data() {
    return {
      formData: {
        affiliationType: this.initialData.affiliationType || '',
        affiliation: this.initialData.affiliation || ''
      },
      errors: { affiliationType: '', affiliation: '' }
    };
  },
  watch: {
    formData: {
      deep: true,
      handler(val) {
        this.$emit('update:data', val);
      }
    },
    'formData.affiliation'() {
      if (this.errors.affiliation) this.validateField('affiliation');
    },
    'formData.affiliationType'() {
      if (this.errors.affiliationType) this.validateField('affiliationType');
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.affiliationTypeInput?.focus());
  },
  methods: {
    validateField(field) {
      if (field === 'affiliationType') {
        if (!this.formData.affiliationType) this.errors.affiliationType = '소속 유형을 선택해주세요.';
        else this.errors.affiliationType = '';
      } else if (field === 'affiliation') {
        if (!this.formData.affiliation) this.errors.affiliation = '소속을 입력해주세요.';
        else this.errors.affiliation = '';
      }
    },
    
    handleSubmit() {
      this.validateField('affiliationType');
      this.validateField('affiliation');
      
      if (this.errors.affiliationType || this.errors.affiliation) return;
      
      this.$emit('submit', this.formData);
    }
  }
};
</script>

<style scoped>
@import './register-shared.css';

.select-icon {
  right: 44px;
}
</style>
