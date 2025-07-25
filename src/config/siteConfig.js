// 사이트 설정 관리 파일
// 시스템 관리자가 쉽게 수정할 수 있는 설정들

export const siteConfig = {
  // 기본 정보
  basic: {
    title: 'Easy-Epidemiology Web v1.2',
    subtitle: '감염병 역학조사 전문 플랫폼',
    description: '집단발생 사례 분석과 역학조사를 위한 통합 웹 기반 분석 솔루션',
    version: 'v1.2',
    lastUpdate: '2025년 1월 27일',
    platform: '웹 기반 (크로스 플랫폼)'
  },

  // 핵심 기능 카드
  features: [
    {
      icon: '📊',
      title: '데이터 입력 & 검증',
      description: '실시간 유효성 검증과 함께 다차원 역학조사 데이터를 효율적으로 입력'
    },
    {
      icon: '👥',
      title: '대상자 특성 분석',
      description: '동적 시각화와 라벨 매핑을 통한 대상자 분포 분석 및 패턴 발견'
    },
    {
      icon: '🩺',
      title: '임상증상 분석',
      description: '증상별 빈도 분석과 인터랙티브 차트로 임상 패턴 파악'
    },
    {
      icon: '📈',
      title: '유행곡선 생성',
      description: '시간대별 발병 패턴 분석과 잠복기 통계로 전파 양상 추적'
    },
    {
      icon: '🔬',
      title: '환자대조군 연구',
      description: '오즈비(OR) 계산과 95% 신뢰구간으로 위험요인 통계분석'
    },
    {
      icon: '📋',
      title: '코호트 연구',
      description: '상대위험도(RR) 분석으로 전향적 연구 결과 해석'
    }
  ],

  // 시스템 특징
  systemFeatures: [
    '실시간 데이터 입력 및 유효성 검증',
    '직관적인 차트 기반 시각화',
    '통계분석 자동화 (OR, RR, 95% CI)',
    '다양한 형식의 데이터 내보내기',
    '브라우저 기반 접근성'
  ],

  // 대상 사용자
  targetUsers: [
    { name: '질병관리청', type: 'gov' },
    { name: '시·도 보건당국', type: 'gov' },
    { name: '시·군·구 감염병 대응팀', type: 'local' },
    { name: '보건소', type: 'local' },
    { name: '역학조사관', type: 'expert' },
    { name: 'FETP 교육생', type: 'expert' },
    { name: '대학 연구기관', type: 'research' },
    { name: '역학조사 실무진', type: 'research' }
  ],

  // 교육과정 연계
  education: {
    timeline: [
      {
        title: '2025년 광주전남 감염병 대응 실무자 교육',
        subtitle: 'FETP-F (Field Epidemiology Training Program)'
      },
      {
        title: '질병관리청 역학조사 표준교육과정',
        subtitle: '연계 실습도구'
      }
    ],
    highlight: '💡 실무 중심의 hands-on 교육을 통한 역학조사 역량 강화'
  },

  // 개발/운영기관 정보
  organization: {
    name: '전남대학교 의과대학',
    department: '예방의학교실',
    center: '감염병 역학조사 및 현장 대응 연구센터',
    team: [
      { role: '책임개발자', name: '양정호' },
      { role: '기술개발자', name: '최인규' }
    ]
  },

  // 빠른 시작 가이드
  quickGuide: [
    {
      step: 1,
      title: '데이터 입력',
      description: '조사대상자 기본정보 및 임상증상 데이터 입력'
    },
    {
      step: 2,
      title: '특성 분석',
      description: '대상자 특성별 분포 분석 및 시각화'
    },
    {
      step: 3,
      title: '패턴 분석',
      description: '유행곡선 생성 및 시간대별 발병 패턴 파악'
    },
    {
      step: 4,
      title: '통계 분석',
      description: '환자대조군/코호트 연구 통계분석 수행'
    },
    {
      step: 5,
      title: '결과 활용',
      description: '분석 결과 내보내기 및 보고서 작성'
    }
  ],

  // 연락처 정보
  contact: {
    title: '운영 기관',
    organization: '전남대학교 의과대학',
    department: '예방의학교실'
  }
};

// 설정 업데이트 함수 (관리자 패널에서 사용)
export function updateSiteConfig(newConfig) {
  try {
    // 로컬 스토리지에 저장
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
    // 페이지 새로고침으로 변경사항 적용
    window.location.reload();
  } catch (error) {
    console.error('설정 업데이트 실패:', error);
    throw error;
  }
}

// 설정 로드 함수
export function loadSiteConfig() {
  try {
    const savedConfig = localStorage.getItem('siteConfig');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    return siteConfig;
  } catch (error) {
    console.error('설정 로드 실패:', error);
    return siteConfig;
  }
}

// 설정 초기화 함수
export function resetSiteConfig() {
  try {
    localStorage.removeItem('siteConfig');
    window.location.reload();
  } catch (error) {
    console.error('설정 초기화 실패:', error);
    throw error;
  }
} 