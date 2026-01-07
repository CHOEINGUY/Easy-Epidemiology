<template>
  <div class="auth-screen">
    <!-- Left Side: Branding with HeroSection-style background -->
    <div class="auth-branding">
      <!-- HeroSection style background -->
      <div class="branding-bg">
        <div class="bg-grid"></div>
        <div class="bg-gradient"></div>
      </div>
      
      <div class="branding-content">
        <h1 class="brand-title">
          <span class="title-light">Easy</span>
          <span class="title-bold">Epidemiology</span>
        </h1>
        <p class="brand-description">
          신속하고 정확한 역학조사를 위한<br/>
          전문 데이터 분석 솔루션
        </p>
        
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon material-icons">edit_note</span>
            <span class="feature-text">직관적인 데이터 입력</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon material-icons">bar_chart</span>
            <span class="feature-text">자동화된 유행곡선 분석</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon material-icons">science</span>
            <span class="feature-text">OR/RR 통계 분석</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Side: Auth Form -->
    <div class="auth-form-section">
      <div class="auth-container">
        <AuthHeader />
        <AuthTabs :show-register="showRegister" @update:showRegister="toggleView" />
        
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
    
    <RegistrationSuccessModal 
      v-if="showRegistrationSuccess" 
      @close="closeRegistrationSuccess" 
    />
  </div>
</template>

<script>
import AuthHeader from './parts/AuthHeader.vue';
import AuthTabs from './parts/AuthTabs.vue';
import AuthLogin from './parts/AuthLogin.vue';
import AuthRegister from './parts/AuthRegister.vue';
import RegistrationSuccessModal from './parts/RegistrationSuccessModal.vue';

export default {
  name: 'AuthScreen',
  components: {
    AuthHeader,
    AuthTabs,
    AuthLogin,
    AuthRegister,
    RegistrationSuccessModal
  },
  data() {
    return {
      showRegister: false,
      isLoading: false,
      error: '',
      showRegistrationSuccess: false
    };
  },
  watch: {
    '$store.state.auth.isAuthenticated'(newValue, oldValue) {
      if (oldValue === true && newValue === false) {
        this.resetState();
      }
    }
  },
  methods: {
    toggleView(isRegister) {
      if (this.showRegister !== isRegister) {
        this.showRegister = isRegister;
        this.resetState();
      }
    },
    
    resetState() {
      this.error = '';
      this.isLoading = false;
    },
    
    async handleLogin(credentials) {
      if (this.isLoading) return;
      this.isLoading = true;
      this.error = '';
      
      try {
        await this.$store.dispatch('auth/login', credentials);
        await new Promise(resolve => setTimeout(resolve, 100));
        this.$emit('login-success');
      } catch (err) {
        if (err.message.includes('Invalid credentials:')) {
          this.error = '이메일/전화번호 또는 비밀번호가 올바르지 않습니다.';
        } else if (err.message.includes('User not found:')) {
          this.error = '등록되지 않은 사용자입니다.';
        } else if (err.message.includes('Account not approved:')) {
          this.error = '관리자 승인을 기다려주세요.';
        } else if (err.message.includes('Network')) {
          this.error = '네트워크 연결을 확인해주세요.';
        } else {
          this.error = '로그인 중 오류가 발생했습니다.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    async handleRegister(registerData) {
      if (this.isLoading) return;
      this.isLoading = true;
      this.error = '';
      
      try {
        await this.$store.dispatch('auth/register', registerData);
        this.showRegistrationSuccess = true;
      } catch (err) {
        if (err.message.includes('Email already exists')) {
          this.error = '이미 사용 중인 이메일입니다.';
        } else if (err.message.includes('Phone already exists')) {
          this.error = '이미 사용 중인 전화번호입니다.';
        } else {
          this.error = `오류: ${err.message}`;
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    closeRegistrationSuccess() {
      this.showRegistrationSuccess = false;
      this.showRegister = false;
      this.resetState();
    }
  }
};
</script>

<style scoped>
.auth-screen {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  font-family: "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

/* Left Side: HeroSection-style Branding */
.auth-branding {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  overflow: hidden;
}

/* Background - HeroSection style */
.branding-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(15, 23, 42, 0.075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
}

.bg-gradient {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06), transparent 60%);
  animation: pulse 10s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.8; }
}

.branding-content {
  position: relative;
  z-index: 10;
  padding: 48px;
  max-width: 480px;
  text-align: center;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 24px 0;
  letter-spacing: -0.04em;
}

.title-light {
  display: block;
  color: #64748b;
  font-weight: 500;
  font-size: 1.5rem;
  margin-bottom: 8px;
}

.title-bold {
  display: block;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-bottom: 8px;
}

.brand-description {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 48px 0;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
}

.feature-icon {
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #0f172a;
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon {
  background: #0f172a;
  color: white;
}

.feature-text {
  color: #475569;
  font-weight: 500;
}

/* Right Side: Form */
.auth-form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 48px;
  overflow-y: auto;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 40px;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Responsive */
@media (max-width: 900px) {
  .auth-screen {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }
  
  .auth-branding {
    flex: none;
    min-height: 300px;
    padding: 32px;
  }
  
  .branding-content {
    padding: 24px;
  }
  
  .brand-title {
    font-size: 2.5rem;
  }
  
  .title-light {
    font-size: 1.2rem;
  }
  
  .brand-description {
    margin-bottom: 24px;
  }
  
  .feature-list {
    display: none;
  }
  
  .auth-form-section {
    flex: 1;
    padding: 32px 24px;
  }
  
  .auth-container {
    padding: 32px 24px;
  }
}
</style>
