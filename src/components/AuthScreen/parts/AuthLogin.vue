<template>
  <div class="animate-fadeUp">
    <form @submit.prevent="handleLogin" novalidate>
      <!-- Portfolio Notice -->
      <div class="mb-8 p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3.5 group hover:bg-slate-100/80 hover:border-slate-200 transition-colors duration-300">
        <div class="p-2 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
          <span class="material-icons text-slate-600 text-lg">school</span>
        </div>
        <div class="text-[14px] leading-relaxed text-slate-600 py-0.5">
          <p class="font-bold text-slate-900 mb-0.5">포트폴리오 체험용 페이지입니다</p>
          <p class="text-[13px] text-slate-500">별도의 정보 입력 없이 하단의 <strong class="text-slate-800 font-bold underline decoration-slate-300 underline-offset-2">로그인 버튼</strong>을 누르시면 자동으로 연결됩니다.</p>
        </div>
      </div>
      <div class="mb-5 transition-all duration-300 ease-in-out group" :class="{ 'has-error': loginErrors.identifier }">
        <label for="login-identifier" class="block text-[13px] font-bold text-slate-700 mb-2 tracking-tight">이메일 또는 전화번호</label>
        <div class="relative">
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
            ref="loginIdentifierRef"
            autocomplete="off"
            class="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-[15px] transition-all duration-200 ease-out bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 pr-12"
            :class="{
              'border-blue-500 bg-blue-50 focus:ring-blue-500/10 focus:border-blue-500': currentInputType === 'phone',
              'border-violet-500 bg-violet-50 focus:ring-violet-500/10 focus:border-violet-500': currentInputType === 'email',
              'border-red-500 bg-red-50 focus:ring-red-500/10 focus:border-red-500 shadow-sm shadow-red-500/5': loginErrors.identifier,
              'border-emerald-500 bg-emerald-50 focus:ring-emerald-500/10 focus:border-emerald-500': !loginErrors.identifier && loginData.identifier && !['phone', 'email'].includes(currentInputType), 
              'focus:border-primary-500': currentInputType === 'ambiguous' && !loginErrors.identifier
            }"
          />
          <span v-if="loginErrors.identifier" class="absolute top-1/2 right-4 -translate-y-1/2 text-red-500 z-10 pointer-events-none">
            <span class="material-icons text-xl">error</span>
          </span>
          <span v-else-if="loginData.identifier && !loginErrors.identifier" class="absolute top-1/2 right-4 -translate-y-1/2 text-emerald-500 z-10 pointer-events-none">
            <span class="material-icons text-xl">check_circle</span>
          </span>
        </div>
      </div>
      
      <div class="mb-6">
        <BaseInput
          id="login-password"
          label="비밀번호"
          v-model="loginData.password"
          type="password"
          placeholder="비밀번호"
          :disabled="isLoading"
          :error="loginErrors.password"
          rounded="lg"
          ref="loginPasswordRef"
          @keydown="handleKeydown"
          @blur="validateLoginField('password')"
        />
      </div>
      
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[13px] font-bold flex items-center gap-2.5 animate-slideIn shadow-sm shadow-red-500/5" role="alert">
        <span class="material-icons text-lg">warning</span>
        {{ error }}
      </div>
      
      <div class="mt-8">
        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          block
          class="!py-4 !rounded-2xl !text-[15px] shadow-premium hover:shadow-xl hover:shadow-slate-900/10"
          :loading="isLoading"
          ref="loginSubmitRef"
        >
          <div class="flex items-center justify-center gap-2.5">
            <span class="material-icons text-xl group-hover:translate-x-1 transition-transform" v-if="!isLoading">login</span>
            <span>체험용 자동 로그인</span>
          </div>
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import BaseInput from '../../Common/BaseInput.vue';
import BaseButton from '../../Common/BaseButton.vue';
import { 
  isValidEmail, 
  isValidPhone, 
  detectInputType, 
  findEmailSuggestion,
  formatPhoneNumber
} from '../logic/inputHandlers';

interface Props {
  isLoading?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: ''
});

const emit = defineEmits<{
  (e: 'login', data: { identifier: string; password?: string; identifierType?: string }): void;
  (e: 'update:error', value: string): void;
}>();

// Refs for DOM elements
const loginIdentifierRef = ref<HTMLInputElement | null>(null);
const loginPasswordRef = ref<any | null>(null); // BaseInput instance
const loginSubmitRef = ref<any | null>(null);   // BaseButton instance

// State
const loginData = ref({ identifier: '', password: '' });
const loginUserInput = ref('');
const loginSuggestion = ref('');
const currentInputType = ref<'phone' | 'email' | 'ambiguous'>('ambiguous'); 
const previousInputType = ref<'phone' | 'email' | 'ambiguous'>('ambiguous');
const identifierType = ref<string>('');
const loginErrors = ref({ identifier: '', password: '' });

// Computed
const loginDisplayValue = computed(() => loginUserInput.value + loginSuggestion.value);

const placeholderText = computed(() => {
  switch (currentInputType.value) {
    case 'phone': return '전화번호';
    case 'email': return '이메일';
    default: return '이메일 또는 전화번호';
  }
});

// Watch
watch(() => loginData.value.password, () => {
  if (loginErrors.value.password) validateLoginField('password');
});

// Mounted
onMounted(() => {
  nextTick(() => {
    loginIdentifierRef.value?.focus();
  });
});

// Methods
function handleKeydown(event: KeyboardEvent) {
  if (props.isLoading) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.id === 'login-password') {
      handleLogin();
    }
  }
}

function handleLoginIdentifierKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && loginSuggestion.value) {
    e.preventDefault();
    loginUserInput.value = loginUserInput.value.slice(0, -1);
    loginSuggestion.value = '';
    loginData.value.identifier = loginUserInput.value;
    
    nextTick(() => {
      loginIdentifierRef.value?.setSelectionRange(
        loginUserInput.value.length,
        loginUserInput.value.length
      );
    });
    return;
  }
  
  if ((e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') && loginSuggestion.value) {
    const target = e.target as HTMLInputElement;
    if (target.selectionStart === loginUserInput.value.length) {
      e.preventDefault();
      loginUserInput.value = loginDisplayValue.value;
      loginSuggestion.value = '';
      loginData.value.identifier = loginDisplayValue.value;
      
      nextTick(() => {
        const fullLength = loginDisplayValue.value.length;
        loginIdentifierRef.value?.setSelectionRange(fullLength, fullLength);
      });
      
      if (e.key === 'Tab') {
        setTimeout(() => loginPasswordRef.value?.focus(), 100);
      }
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    loginPasswordRef.value?.focus();
  }
}

function handleLoginIdentifierInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const currentUserInput = target.value;
  const detectedType = detectInputType(currentUserInput);
  
  if (detectedType === 'phone') processPhoneInput(currentUserInput);
  else if (detectedType === 'email') processEmailInput(currentUserInput);
  else processAmbiguousInput(currentUserInput);
  
  previousInputType.value = currentInputType.value;
  currentInputType.value = detectedType;
  
  nextTick(() => {
    if (currentInputType.value === 'email' && loginSuggestion.value) setupEmailSelectionRange();
    if (loginErrors.value.identifier) validateLoginField('identifier');
  });
}

function processPhoneInput(currentInput: string) {
  const formatted = formatPhoneNumber(currentInput);
  loginUserInput.value = formatted;
  loginSuggestion.value = '';
  loginData.value.identifier = formatted;
  identifierType.value = 'phone';
}

function processEmailInput(currentInput: string) {
  let input = currentInput;
  if (input.includes('@')) input = input.replace(/-/g, '');
  
  const atIndex = input.lastIndexOf('@');
  if (atIndex === -1) {
    loginUserInput.value = input;
    loginSuggestion.value = '';
    loginData.value.identifier = input;
    return;
  }
  
  const domainPart = input.slice(atIndex + 1);
  const foundDomain = findEmailSuggestion(domainPart);
  
  if (foundDomain && domainPart.length > 0) {
    loginUserInput.value = input.slice(0, atIndex + 1) + domainPart;
    loginSuggestion.value = foundDomain.substring(domainPart.length);
  } else {
    loginUserInput.value = input;
    loginSuggestion.value = '';
  }
  
  loginData.value.identifier = loginDisplayValue.value;
  identifierType.value = 'email';
  setupEmailSelectionRange();
}

function processAmbiguousInput(currentInput: string) {
  let input = currentInput;
  if (input.includes('@')) input = input.replace(/-/g, '');
  loginUserInput.value = input;
  loginSuggestion.value = '';
  loginData.value.identifier = input;
  identifierType.value = '';
}

function setupEmailSelectionRange() {
  if (loginSuggestion.value) {
    [10, 50, 100].forEach(delay => {
      setTimeout(() => {
        loginIdentifierRef.value?.setSelectionRange(
          loginUserInput.value.length,
          loginDisplayValue.value.length
        );
      }, delay);
    });
  }
}

function validateLoginField(field: 'identifier' | 'password') {
  if (field === 'identifier') {
    if (!loginData.value.identifier) {
      loginErrors.value.identifier = '이메일 또는 전화번호를 입력해주세요.';
    } else {
      if (currentInputType.value === 'email') {
        if (!isValidEmail(loginData.value.identifier)) loginErrors.value.identifier = '올바른 이메일 형식이 아닙니다.';
        else loginErrors.value.identifier = '';
      } else if (currentInputType.value === 'phone') {
        if (!isValidPhone(loginData.value.identifier)) loginErrors.value.identifier = '올바른 전화번호 형식이 아닙니다.';
        else loginErrors.value.identifier = '';
      } else {
        loginErrors.value.identifier = '';
      }
    }
  } else if (field === 'password') {
    if (!loginData.value.password) loginErrors.value.password = '비밀번호를 입력해주세요.';
    else loginErrors.value.password = '';
  }
}

function handleLogin() {
  if (!loginData.value.identifier) {
    loginData.value.identifier = 'demo@example.com';
    loginUserInput.value = 'demo@example.com';
    identifierType.value = 'email';
  }
  
  if (!loginData.value.password) {
    loginData.value.password = 'demo1234';
  }

  if (loginData.value.identifier === 'demo@example.com' && loginData.value.password === 'demo1234') {
    loginErrors.value.identifier = '';
    loginErrors.value.password = '';
  } else {
    validateLoginField('identifier');
    validateLoginField('password');
    
    if (loginErrors.value.identifier || loginErrors.value.password) return;
  }
  
  emit('login', {
    identifier: loginData.value.identifier,
    password: loginData.value.password,
    identifierType: identifierType.value
  });
}
</script>


