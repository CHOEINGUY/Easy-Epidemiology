/**
 * Vuex 인증 상태 관리 모듈
 * 사용자 인증 상태와 관련 액션을 관리합니다.
 */
import { AuthManager } from '../auth/AuthManager.js';
import { UserManager } from '../auth/UserManager.js';

// 인증 매니저 인스턴스
const authManager = new AuthManager();
const userManager = new UserManager();

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
    async register({ commit }, { username, password }) {
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        const result = await authManager.register(username, password);
        
        // 사용자별 데이터 초기화
        userManager.initializeUserData(username);
        
        // StoreBridge에 현재 사용자 설정
        if (window.storeBridge) {
          window.storeBridge.setCurrentUser(result.user);
        }
        
        commit('SET_USER', result.user);
        commit('CLOSE_FORMS');
        
        return result;
      } catch (error) {
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 사용자 로그인
     */
    async login({ commit }, { username, password }) {
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        const result = await authManager.login(username, password);
        
        // 사용자별 데이터 초기화
        userManager.initializeUserData(username);
        
        // StoreBridge에 현재 사용자 설정
        if (window.storeBridge) {
          window.storeBridge.setCurrentUser(result.user);
        }
        
        commit('SET_USER', result.user);
        commit('CLOSE_FORMS');
        
        return result;
      } catch (error) {
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 로그아웃
     */
    logout({ commit }) {
      authManager.logout();
      commit('SET_USER', null);
      commit('CLEAR_ERROR');
    },

    /**
     * 자동 로그인 체크
     */
    async checkAutoLogin({ commit }) {
      commit('SET_LOADING', true);
      
      try {
        const isLoggedIn = authManager.checkAutoLogin();
        
        if (isLoggedIn) {
          const currentUser = authManager.getCurrentUser();
          const userInfo = {
            username: currentUser.username,
            dataKey: currentUser.dataKey
          };
          
          // StoreBridge에 현재 사용자 설정
          if (window.storeBridge) {
            window.storeBridge.setCurrentUser(userInfo);
          }
          
          commit('SET_USER', userInfo);
          
          // 사용자별 데이터 초기화
          userManager.initializeUserData(currentUser.username);
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
     * 기존 데이터 마이그레이션
     */
    async migrateExistingData({ commit }, defaultUsername = 'default') {
      commit('SET_LOADING', true);
      
      try {
        userManager.migrateExistingData(defaultUsername);
        
        // 마이그레이션 후 자동 로그인
        const isLoggedIn = authManager.checkAutoLogin();
        if (isLoggedIn) {
          const currentUser = authManager.getCurrentUser();
          const userInfo = {
            username: currentUser.username,
            dataKey: currentUser.dataKey
          };
          
          // StoreBridge에 현재 사용자 설정
          if (window.storeBridge) {
            window.storeBridge.setCurrentUser(userInfo);
          }
          
          commit('SET_USER', userInfo);
        }
        
        return true;
      } catch (error) {
        commit('SET_ERROR', `마이그레이션 실패: ${error.message}`);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    /**
     * 로그인 폼 표시/숨김
     */
    showLoginForm({ commit }) {
      commit('SET_LOGIN_FORM', true);
    },

    /**
     * 회원가입 폼 표시/숨김
     */
    showRegisterForm({ commit }) {
      commit('SET_REGISTER_FORM', true);
    },

    /**
     * 폼 닫기
     */
    closeForms({ commit }) {
      commit('CLOSE_FORMS');
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
     * 로그인 폼 표시 여부
     */
    showLoginForm: state => state.showLoginForm,
    
    /**
     * 회원가입 폼 표시 여부
     */
    showRegisterForm: state => state.showRegisterForm,
    
    /**
     * 폼 표시 여부 (로그인 또는 회원가입)
     */
    showAnyForm: state => state.showLoginForm || state.showRegisterForm,
    
    /**
     * 사용자별 데이터 키
     */
    userDataKey: state => state.currentUser?.dataKey || 'epidemiology_data'
  }
}; 