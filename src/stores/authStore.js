import { defineStore } from 'pinia';
import { authApi, tokenManager, userManager } from '../services/authApi.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  }),

  getters: {
    isAdmin(state) {
      const user = state.currentUser;
      return user && (user.role === 'admin' || user.role === 'support');
    }
  },

  actions: {
    setUser(user) {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    },

    setLoading(loading) {
      this.isLoading = loading;
    },

    setError(error) {
      this.error = error;
    },

    clearError() {
      this.error = null;
    },

    async register(userData) {
      console.log('🏪 Store register 액션 시작:', userData);
      this.setLoading(true);
      this.clearError();
      
      try {
        console.log('📞 authApi.register 호출');
        const result = await authApi.register(userData);
        console.log('✅ authApi.register 성공:', result);
        
        // 성공 시 StoreBridge에 현재 사용자 설정
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function' && result.data) {
          console.log('🔗 StoreBridge에 사용자 설정');
          try {
            window.storeBridge.setCurrentUser(result.data);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
          }
        }
        
        return result;
      } catch (error) {
        console.error('❌ register 액션 실패:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    async login({ identifier, password, identifierType }) {
      console.log('🏪 Store login 액션 시작:', { identifier, identifierType });
      this.setLoading(true);
      this.clearError();
      
      try {
        console.log('📞 authApi.login 호출');
        const result = await authApi.login({ identifier, password, identifierType });
        console.log('✅ authApi.login 성공:', result);
        
        // 토큰과 사용자 정보 저장
        tokenManager.saveToken(result.data.token);
        userManager.saveUser(result.data.user);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
          try {
            window.storeBridge.setCurrentUser(result.data.user);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
          }
        }
        
        this.setUser(result.data.user);
        return result;
      } catch (error) {
        console.error('❌ login 액션 실패:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    async logout() {
      console.log('🏪 Store logout 액션 시작');
      try {
        tokenManager.removeToken();
        userManager.removeUser();
        
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
          try {
            window.storeBridge.setCurrentUser(null);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 제거 실패:', bridgeError);
          }
        }
        
        this.setUser(null);
        this.clearError();
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ logout 액션 실패:', error);
        tokenManager.removeToken();
        userManager.removeUser();
        this.setUser(null);
        this.clearError();
      }
    },

    async checkAutoLogin() {
      this.setLoading(true);
      try {
        const isLoggedIn = userManager.isLoggedIn();
        
        if (isLoggedIn) {
          const currentUser = userManager.getUser();
          
          if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
            try {
              window.storeBridge.setCurrentUser(currentUser);
            } catch (bridgeError) {
              console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
            }
          }
          
          this.setUser(currentUser);
        }
        return isLoggedIn;
      } catch (error) {
        console.error('자동 로그인 체크 실패:', error);
        return false;
      } finally {
        this.setLoading(false);
      }
    }
  }
});
