<template>
  <div class="min-h-full flex font-['Noto_Sans_KR',_sans-serif] overflow-x-hidden">
    <!-- Left Side: Branding with HeroSection-style background -->
    <div class="hidden lg:flex flex-1 relative items-center justify-center bg-white overflow-hidden">
      <!-- HeroSection style background -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[length:50px_50px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]"></div>
        <div class="absolute -inset-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.06),transparent_60%)] animate-heroPulse"></div>
      </div>
      
      <div class="relative z-10 p-12 max-w-[480px] text-center animate-fadeUp">
        <h1 class="text-[3.5rem] font-extrabold leading-[1.2] mb-6 tracking-tight">
          <span class="block text-slate-500 font-medium text-2xl mb-2">Easy</span>
          <span class="block bg-gradient-to-br from-blue-500 to-blue-700 bg-clip-text text-transparent pb-2">Epidemiology</span>
        </h1>
        <p class="text-[1.1rem] text-slate-500 leading-relaxed mb-12">
          신속하고 정확한 역학조사를 위한<br/>
          전문 데이터 분석 솔루션
        </p>
        
        <div class="flex flex-col gap-4 text-left">
          <div class="flex items-center gap-3 text-[0.95rem] group">
            <div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl text-slate-900 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
              <span class="material-icons">edit_note</span>
            </div>
            <span class="text-slate-600 font-medium tracking-tight">직관적인 데이터 입력</span>
          </div>
          <div class="flex items-center gap-3 text-[0.95rem] group">
            <div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl text-slate-900 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
              <span class="material-icons">bar_chart</span>
            </div>
            <span class="text-slate-600 font-medium tracking-tight">자동화된 유행곡선 분석</span>
          </div>
          <div class="flex items-center gap-3 text-[0.95rem] group">
            <div class="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl text-slate-900 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
              <span class="material-icons">science</span>
            </div>
            <span class="text-slate-600 font-medium tracking-tight">OR/RR 통계 분석</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Side: Auth Form -->
    <div class="flex-1 flex items-center justify-center bg-slate-50/50 p-6 md:p-12 relative overflow-hidden">
      <!-- Decorative background for form side -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

      <div class="w-full max-w-[460px] bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3.5xl border border-white/40 shadow-glass animate-slideIn relative z-10 transition-all duration-500">
        <AuthHeader :title="showRegister ? '회원가입' : '로그인'" />
        <AuthTabs :show-register="showRegister" @update:showRegister="toggleView" />
        
        <div class="mt-8">
          <AuthLogin 
            v-if="!showRegister"
            :is-loading="isLoading"
            :error="error"
            @login="handleLogin"
            @update:error="error = $event"
          />
          
          <AuthRegister 
            v-if="showRegister"
            :is-loading="isLoading"
            :error="error"
            @register="handleRegister"
            @update:error="error = $event"
          />
        </div>
      </div>
    </div>
    
    <RegistrationSuccessModal 
      v-if="showRegistrationSuccess" 
      @close="closeRegistrationSuccess" 
    />
  </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue';
import { useAuthStore } from '../../stores/authStore';

// Parts
import AuthHeader from './parts/AuthHeader.vue';
import AuthTabs from './parts/AuthTabs.vue';
import AuthLogin from './parts/AuthLogin.vue';
import AuthRegister from './parts/AuthRegister/index.vue';
import RegistrationSuccessModal from './parts/RegistrationSuccessModal.vue';

// Emits
const emit = defineEmits(['login-success']);

// Store
const authStore = useAuthStore();

// State
const showRegister = ref(false);
const isLoading = ref(false);
const error = ref('');
const showRegistrationSuccess = ref(false);

// Watch for auth state changes
watch(() => authStore.isAuthenticated, (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    resetState();
  }
});

// Methods
function toggleView(isRegister) {
  if (showRegister.value !== isRegister) {
    showRegister.value = isRegister;
    resetState();
  }
}

function resetState() {
  error.value = '';
  isLoading.value = false;
}

async function handleLogin(credentials) {
  if (isLoading.value) return;
  isLoading.value = true;
  error.value = '';
  
  try {
    // Dispatching directly to Pinia action
    await authStore.login(credentials);
    await new Promise(resolve => setTimeout(resolve, 100)); // wait for 100ms
    emit('login-success');
  } catch (err) {
    if (err.message.includes('Invalid credentials:')) {
      error.value = '이메일/전화번호 또는 비밀번호가 올바르지 않습니다.';
    } else if (err.message.includes('User not found:')) {
      error.value = '등록되지 않은 사용자입니다.';
    } else if (err.message.includes('Account not approved:')) {
      error.value = '관리자 승인을 기다려주세요.';
    } else if (err.message.includes('Network')) {
      error.value = '네트워크 연결을 확인해주세요.';
    } else {
      error.value = '로그인 중 오류가 발생했습니다.';
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleRegister(registerData) {
  if (isLoading.value) return;
  isLoading.value = true;
  error.value = '';
  
  try {
    await authStore.register(registerData);
    showRegistrationSuccess.value = true;
  } catch (err) {
    if (err.message.includes('Email already exists')) {
      error.value = '이미 사용 중인 이메일입니다.';
    } else if (err.message.includes('Phone already exists')) {
      error.value = '이미 사용 중인 전화번호입니다.';
    } else {
      error.value = `오류: ${err.message}`;
    }
  } finally {
    isLoading.value = false;
  }
}

function closeRegistrationSuccess() {
  showRegistrationSuccess.value = false;
  showRegister.value = false;
  resetState();
}
</script>

<style scoped>
/* All styles handled via Tailwind */
</style>
