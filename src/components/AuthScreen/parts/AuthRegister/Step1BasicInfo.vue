<template>
  <div class="animate-in fade-in slide-in-from-right-3 duration-300">
    <StepIndicator :current-step="1" :total-steps="3" />
    <h3 class="text-center text-xl font-bold text-slate-900 mb-7 tracking-tight">기본 정보 입력</h3>
    
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- 이름 -->
      <div class="group/field">
        <label for="register-name" class="block text-[13px] font-bold text-slate-700 mb-2 tracking-tight px-0.5">이름</label>
        <div class="relative">
          <input
            id="register-name"
            v-model="formData.name"
            type="text"
            placeholder="실명을 입력하세요"
            required
            :disabled="isLoading"
            maxlength="50"
            @blur="validateField('name')"
            ref="nameInputRef"
            class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:ring-4 focus:bg-white pr-12"
            :class="[
              errors.name ? 'border-red-500 focus:ring-red-500/10' : 
              (formData.name && !errors.name ? 'border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-primary-500 focus:ring-primary-500/10')
            ]"
          />
          <span v-if="errors.name" class="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">error</span>
          </span>
          <span v-else-if="formData.name && !errors.name" class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">check_circle</span>
          </span>
        </div>
        <div class="h-6 mt-1">
          <small v-if="errors.name" class="block text-xs font-bold text-red-500 px-1 animate-slideIn">{{ errors.name }}</small>
        </div>
      </div>
      
      <!-- 이메일 -->
      <div class="group/field">
        <label for="register-email" class="block text-[13px] font-bold text-slate-700 mb-2 tracking-tight px-0.5">이메일 주소</label>
        <div class="relative">
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
            ref="emailInputRef"
            autocomplete="off"
            class="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:ring-4 focus:bg-white pr-12 bg-slate-50"
            :class="[
              errors.email ? 'border-red-500 focus:ring-red-500/10' : 
              (formData.email && !errors.email ? 'border-emerald-500 focus:ring-emerald-500/10' : 'bg-violet-50/30 border-violet-200 focus:border-violet-500 focus:ring-violet-500/10')
            ]"
          />
          <span v-if="errors.email" class="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">error</span>
          </span>
          <span v-else-if="formData.email && !errors.email" class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">check_circle</span>
          </span>
        </div>
        <div class="h-6 mt-1">
          <small v-if="errors.email" class="block text-xs font-bold text-red-500 px-1 animate-slideIn">{{ errors.email }}</small>
        </div>
      </div>
      
      <!-- 전화번호 -->
      <div class="group/field">
        <label for="register-phone" class="block text-[13px] font-bold text-slate-700 mb-2 tracking-tight px-0.5">전화번호</label>
        <div class="relative">
          <input
            id="register-phone"
            v-model="formData.phone"
            type="tel"
            placeholder="전화번호를 입력하세요"
            required
            :disabled="isLoading"
            @input="handlePhoneInput"
            @blur="validateField('phone')"
            maxlength="13"
            ref="phoneInputRef"
            class="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-[15px] transition-all duration-300 focus:outline-none focus:ring-4 focus:bg-white pr-12 bg-slate-50"
            :class="[
              errors.phone ? 'border-red-500 focus:ring-red-500/10' : 
              (formData.phone && !errors.phone ? 'border-emerald-500 focus:ring-emerald-500/10' : 'bg-blue-50/30 border-blue-200 focus:border-blue-500 focus:ring-blue-500/10')
            ]"
          />
          <span v-if="errors.phone" class="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">error</span>
          </span>
          <span v-else-if="formData.phone && !errors.phone" class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center pointer-events-none">
            <span class="material-icons text-xl">check_circle</span>
          </span>
        </div>
        <div class="h-6 mt-1">
          <small v-if="errors.phone" class="block text-xs font-bold text-red-500 px-1 animate-slideIn">{{ errors.phone }}</small>
        </div>
      </div>
      
      <div class="text-center py-2">
        <small class="text-slate-500 text-xs font-medium bg-slate-100/50 px-3 py-1.5 rounded-full">이메일 또는 전화번호로 로그인할 수 있습니다.</small>
      </div>
      
      <div v-if="localError" class="bg-red-50 text-red-600 p-4 rounded-xl text-[13px] font-bold border border-red-100 flex items-center gap-2.5 shadow-sm shadow-red-500/5" role="alert">
        <span class="material-icons text-lg">warning</span>
        {{ localError }}
      </div>
      
      <div class="pt-4">
        <button 
          type="submit" 
          class="w-full py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-bold rounded-2xl text-[15px] shadow-premium transition-all duration-300 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2.5 group relative overflow-hidden"
          :disabled="isLoading || !formData.name || !formData.email || !formData.phone"
        >
          <span v-if="isLoading" class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
          <span v-if="isLoading">확인 중...</span>
          <template v-else>
            <span class="relative z-10">다음 단계</span>
            <span class="material-icons text-xl relative z-10 transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
          </template>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import StepIndicator from './StepIndicator.vue';
import { 
  isValidEmail, 
  isValidPhone, 
  findEmailSuggestion,
  formatPhoneNumber
} from '../../logic/inputHandlers';

interface Props {
  isLoading?: boolean;
  initialData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  initialData: () => ({})
});

const emit = defineEmits<{
  (e: 'next', data: any): void;
  (e: 'update:data', value: any): void;
}>();

// Refs
const nameInputRef = ref<HTMLInputElement | null>(null);
const emailInputRef = ref<HTMLInputElement | null>(null);
const phoneInputRef = ref<HTMLInputElement | null>(null);

// State
const formData = ref({
  name: props.initialData.name || '',
  email: props.initialData.email || '',
  phone: props.initialData.phone || ''
});
const errors = ref({ name: '', email: '', phone: '' });
const localError = ref('');
const userInput = ref('');
const suggestion = ref('');

// Computed
const displayValue = computed(() => userInput.value + suggestion.value);

// Watch
watch(formData, (val) => {
  emit('update:data', val);
}, { deep: true });

// Mounted
onMounted(() => {
  nextTick(() => nameInputRef.value?.focus());
});

// Methods
function validateField(field: 'name' | 'email' | 'phone') {
  if (field === 'name') {
    if (!formData.value.name) errors.value.name = '이름을 입력해주세요.';
    else if (formData.value.name.length < 2) errors.value.name = '이름은 2자 이상 입력해주세요.';
    else errors.value.name = '';
  } else if (field === 'email') {
    if (!formData.value.email) errors.value.email = '이메일 주소를 입력해주세요.';
    else if (!isValidEmail(formData.value.email)) errors.value.email = '올바른 이메일 형식이 아닙니다.';
    else errors.value.email = '';
  } else if (field === 'phone') {
    if (!formData.value.phone) errors.value.phone = '전화번호를 입력해주세요.';
    else if (!isValidPhone(formData.value.phone)) errors.value.phone = '올바른 전화번호 형식이 아닙니다.';
    else errors.value.phone = '';
  }
}

function handleEmailInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const input = target.value;
  const atIndex = input.lastIndexOf('@');
  
  if (atIndex === -1) {
    userInput.value = input;
    suggestion.value = '';
    formData.value.email = input;
    return;
  }
  
  const domainPart = input.slice(atIndex + 1);
  const foundDomain = findEmailSuggestion(domainPart);
  
  if (foundDomain && domainPart.length > 0) {
    userInput.value = input.slice(0, atIndex + 1) + domainPart;
    suggestion.value = foundDomain.substring(domainPart.length);
  } else {
    userInput.value = input;
    suggestion.value = '';
  }
  
  formData.value.email = displayValue.value;
  localError.value = '';
  if (errors.value.email) validateField('email');
  
  nextTick(() => {
    if (suggestion.value && emailInputRef.value) {
      emailInputRef.value.setSelectionRange(userInput.value.length, displayValue.value.length);
    }
  });
}

function handleEmailKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && suggestion.value) {
    e.preventDefault();
    userInput.value = userInput.value.slice(0, -1);
    suggestion.value = '';
    formData.value.email = userInput.value;
    return;
  }
  
  if ((e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') && suggestion.value) {
    const target = e.target as HTMLInputElement;
    if (target.selectionStart === userInput.value.length) {
      e.preventDefault();
      userInput.value = displayValue.value;
      suggestion.value = '';
      formData.value.email = displayValue.value;
      
      if (e.key === 'Tab') {
        setTimeout(() => phoneInputRef.value?.focus(), 100);
      }
    }
  }
}

function handleEmailBlur() {
  setTimeout(() => {
    suggestion.value = '';
    validateField('email');
  }, 150);
}

function handlePhoneInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const formatted = formatPhoneNumber(target.value);
  formData.value.phone = formatted;
  localError.value = '';
  if (errors.value.phone) validateField('phone');
}

function handleSubmit() {
  validateField('name');
  validateField('email');
  validateField('phone');
  
  if (errors.value.name || errors.value.email || errors.value.phone) return;
  
  emit('next', formData.value);
}

function setError(field: 'name' | 'email' | 'phone' | 'local', message: string) {
  if (field === 'local') {
    localError.value = message;
  } else {
    errors.value[field] = message;
  }
}

defineExpose({ setError });
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
