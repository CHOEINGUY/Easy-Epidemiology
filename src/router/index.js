import { createRouter, createWebHistory } from 'vue-router';
import { isAuthRequired } from '../utils/environmentUtils.js';

// Component Imports
import DataInputVirtual from '../components/DataInputVirtualScroll/DataInputVirtual.vue';
import PatientCharacteristics from '../components/PatientCharacteristics/index.vue';
import EpidemicCurve from '../components/EpidemicCurve/index.vue';
import CaseControl from '../components/CaseControl/index.vue';
import CohortStudy from '../components/CohortStudy/index.vue';
import HomePage from '../components/Home/index.vue';
import ClinicalSymptoms from '../components/ClinicalSymptoms/index.vue';
import CaseSeries from '../components/CaseSeries/index.vue';
import ReportWriter from '../components/ReportWriter/index.vue';
import AuthScreen from '../components/AuthScreen/index.vue';
import AdminPanel from '../components/AdminPanel/index.vue';

const routes = [
  {
    path: '/',
    redirect: () => {
      // If auth is not required, go to input
      if (!isAuthRequired()) {
        return '/input';
      }
      // If auth is required, check token (simplified check here, guard does real work)
      const token = localStorage.getItem('authToken');
      return token ? '/input' : '/login';
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: AuthScreen,
    meta: { guestOnly: true }
  },
  {
    path: '/input',
    name: 'DataInputVirtual',
    component: DataInputVirtual,
    meta: { title: '데이터 입력' }
  },
  {
    path: '/patient',
    name: 'PatientCharacteristics',
    component: PatientCharacteristics,
    meta: { title: '환자 특성' }
  },
  {
    path: '/curve',
    name: 'EpidemicCurve',
    component: EpidemicCurve,
    meta: { title: '유행 곡선' }
  },
  {
    path: '/symptoms',
    name: 'ClinicalSymptoms',
    component: ClinicalSymptoms,
    meta: { title: '임상 증상' }
  },
  {
    path: '/case-control',
    name: 'CaseControl',
    component: CaseControl,
    meta: { title: '환자-대조군 연구' }
  },
  {
    path: '/cohort',
    name: 'CohortStudy',
    component: CohortStudy,
    meta: { title: '코호트 연구' }
  },
  {
    path: '/case-series',
    name: 'CaseSeries',
    component: CaseSeries,
    meta: { title: '사례군 조사' }
  },
  {
    path: '/report',
    name: 'ReportWriter',
    component: ReportWriter,
    meta: { title: '보고서 작성' }
  },
  {
    path: '/info',
    name: 'HomePage',
    component: HomePage,
    meta: { title: '웹페이지 정보' }
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: AdminPanel,
    meta: { requiresAdmin: true, title: '관리자 패널' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  // Update document title
  if (to.meta.title) {
    document.title = `${to.meta.title} - Easy Epidemiology`;
  }

  // 1. Check if Auth is required globally
  if (!isAuthRequired()) {
    return next();
  }

  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAuthenticated = !!(token && user && (user.isApproved || user.approved));
  const isAdmin = user && (user.role === 'admin' || user.role === 'support');

  // 2. Redirect to Login if not authenticated
  if (to.name !== 'Login' && !isAuthenticated) {
    return next({ name: 'Login' });
  }

  // 3. Prevent authenticated users from visiting Login
  if (to.name === 'Login' && isAuthenticated) {
    return next({ path: '/input' });
  }

  // 4. Admin Guard
  if (to.meta.requiresAdmin && !isAdmin) {
    alert('접근 권한이 없습니다.');
    return next({ path: '/input' });
  }

  next();
});

export default router;
