import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/authStore';

// Mock authApi
jest.mock('../../src/services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn()
  },
  tokenManager: {
    saveToken: jest.fn(),
    removeToken: jest.fn(),
    getToken: jest.fn()
  },
  userManager: {
    saveUser: jest.fn(),
    removeUser: jest.fn(),
    getUser: jest.fn(),
    isLoggedIn: jest.fn()
  }
}));

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets user correctly', () => {
    const auth = useAuthStore();
    const user = { name: 'Test User' };
    auth.setUser(user);
    expect(auth.currentUser).toEqual(user);
    expect(auth.isAuthenticated).toBe(true);
  });

  it('clears user on logout', async () => {
    const auth = useAuthStore();
    const user = { name: 'Test User' };
    auth.setUser(user);

    await auth.logout();

    expect(auth.currentUser).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });
});
