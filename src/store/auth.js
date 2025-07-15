/**
 * Vuex 인증 상태 관리 모듈
 * 사용자 인증 상태와 관련 액션을 관리합니다.
 */
import { authApi, tokenManager, userManager } from '../services/authApi.js';

export default {
  namespaced: true,
  
  state: {
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  },

  mutations: {
    SET_USER(state, user) {
      state.currentUser = user;
      state.isAuthenticated = !!user;
    },
    
    SET_LOADING(state, loading) {
      state.isLoading = loading;
    },
    
    SET_ERROR(state, error) {
      state.error = error;
    },
    
    CLEAR_ERROR(state) {
      state.error = null;
    }
  },

  actions: {
    /**
     * 사용자 등록
     */
    async register({ commit }, userData) {
      console.log('🏪 Store register 액션 시작:', userData);
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        console.log('📞 authApi.register 호출');
        const result = await authApi.register(userData);
        console.log('✅ authApi.register 성공:', result);
        
        // 성공 시 StoreBridge에 현재 사용자 설정 (선택사항)
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function' && result.data) {
          console.log('🔗 StoreBridge에 사용자 설정');
          try {
            window.storeBridge.setCurrentUser(result.data);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
          }
        } else {
          console.log('ℹ️ StoreBridge가 없거나 setCurrentUser 함수가 없습니다.');
        }
        
        // 성공 시 오류를 throw하지 않고 결과 반환
        console.log('🎯 register 액션 완료 - 결과 반환');
        return result;
      } catch (error) {
        console.error('❌ register 액션 실패:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 사용자 로그인 (이메일/전화번호/아이디 지원)
     */
    async login({ commit }, { identifier, password, identifierType }) {
      console.log('🏪 Store login 액션 시작:', { identifier, identifierType });
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        console.log('📞 authApi.login 호출');
        const result = await authApi.login({ identifier, password, identifierType });
        console.log('✅ authApi.login 성공:', result);
        
        // 토큰과 사용자 정보 저장
        console.log('💾 토큰 및 사용자 정보 저장 시작');
        tokenManager.saveToken(result.data.token);
        userManager.saveUser(result.data.user);
        console.log('✅ 토큰 및 사용자 정보 저장 완료');
        
        // localStorage 저장이 완료될 때까지 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // StoreBridge에 현재 사용자 설정 (안전한 호출)
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
          console.log('🔗 StoreBridge에 사용자 설정');
          try {
            window.storeBridge.setCurrentUser(result.data.user);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
          }
        } else {
          console.log('ℹ️ StoreBridge가 없거나 setCurrentUser 함수가 없습니다.');
        }
        
        console.log('👤 Store에 사용자 설정:', result.data.user);
        commit('SET_USER', result.data.user);
        
        console.log('🎯 login 액션 완료 - 결과 반환');
        return result;
      } catch (error) {
        console.error('❌ login 액션 실패:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 로그아웃
     */
    async logout({ commit }) {
      console.log('🏪 Store logout 액션 시작');
      
      try {
        // 토큰과 사용자 정보 삭제
        console.log('🗑️ 토큰 및 사용자 정보 삭제 시작');
        tokenManager.removeToken();
        userManager.removeUser();
        console.log('✅ 토큰 및 사용자 정보 삭제 완료');
        
        // StoreBridge에서 사용자 정보 제거 (안전한 호출)
        if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
          console.log('🔗 StoreBridge에서 사용자 정보 제거');
          try {
            window.storeBridge.setCurrentUser(null);
          } catch (bridgeError) {
            console.warn('⚠️ StoreBridge 사용자 제거 실패:', bridgeError);
          }
        } else {
          console.log('ℹ️ StoreBridge가 없거나 setCurrentUser 함수가 없습니다.');
        }
        
        // Store 상태 초기화
        console.log('🔄 Store 상태 초기화');
        commit('SET_USER', null);
        commit('CLEAR_ERROR');
        
        // localStorage 변경사항이 반영될 때까지 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🎯 logout 액션 완료');
      } catch (error) {
        console.error('❌ logout 액션 실패:', error);
        // 에러가 발생해도 기본적인 로그아웃은 수행
        tokenManager.removeToken();
        userManager.removeUser();
        commit('SET_USER', null);
        commit('CLEAR_ERROR');
      }
    },

    /**
     * 자동 로그인 체크
     */
    async checkAutoLogin({ commit }) {
      commit('SET_LOADING', true);
      
      try {
        const isLoggedIn = userManager.isLoggedIn();
        
        if (isLoggedIn) {
          const currentUser = userManager.getUser();
          
          // StoreBridge에 현재 사용자 설정 (안전한 호출)
          if (window.storeBridge && typeof window.storeBridge.setCurrentUser === 'function') {
            try {
              window.storeBridge.setCurrentUser(currentUser);
            } catch (bridgeError) {
              console.warn('⚠️ StoreBridge 사용자 설정 실패:', bridgeError);
            }
          }
          
          commit('SET_USER', currentUser);
        }
        
        return isLoggedIn;
      } catch (error) {
        console.error('자동 로그인 체크 실패:', error);
        return false;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 에러 초기화
     */
    clearError({ commit }) {
      commit('CLEAR_ERROR');
    }
  },

  getters: {
    /**
     * 현재 사용자 정보
     */
    currentUser: state => state.currentUser,
    
    /**
     * 인증 상태
     */
    isAuthenticated: state => state.isAuthenticated,
    
    /**
     * 로딩 상태
     */
    isLoading: state => state.isLoading,
    
    /**
     * 에러 메시지
     */
    error: state => state.error,
    
    /**
     * 관리자 권한 확인
     */
    isAdmin: state => {
      const user = state.currentUser;
      return user && (user.role === 'admin' || user.role === 'support');
    }
  }
}; 