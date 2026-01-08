// 사이트 설정 관리 파일
// 시스템 관리자가 쉽게 수정할 수 있는 설정들

export const siteConfig = {
  // 기본 정보
  basic: {
    title: 'Easy-Epidemiology Web v2.0',
    subtitle: '감염병 역학조사 전문 플랫폼',
    description: '집단발생 사례 분석과 역학조사를 위한 통합 웹 기반 분석 솔루션',
    version: 'v2.0',
    lastUpdate: '2025년 1월 27일',
    platform: '웹 기반 (크로스 플랫폼)'
  },

  // 핵심 기능 카드
  features: [
    {
      icon: '📊',
      title: '데이터 입력 & 검증',
      description: 'Web Worker 기반 비동기 처리와 가상 스크롤 기술로 대용량 데이터를 지연 없이 입력하며 실시간 유효성 검증 수행'
    },
    {
      icon: '👥',
      title: '대상자 특성 분석',
      description: '변수별 빈도분포와 발병률(AR) 자동 계산, 라벨 매핑 시스템을 통한 직관적인 범주 처러 및 동적 시각화'
    },
    {
      icon: '🩺',
      title: '임상증상 분석',
      description: 'ECharts 기반의 고성능 인터랙티브 차트, 다중 정렬 알고리즘과 실시간 필터링을 통한 증상 패턴 정밀 분석'
    },
    {
      icon: '📈',
      title: '유행곡선 & 잠복기',
      description: '잠복기 통계량(최소/최대/평균/중앙값) 자동 산출 및 노출일자 추정을 위한 역학적 곡선 시각화'
    },
    {
      icon: '🔬',
      title: '환자대조군 연구',
      description: 'Fisher 정확검정(기대빈도<5), Yates 연속성 보정 자동 적용 및 Log-scale 변환을 통한 OR 95% 신뢰구간 정밀 산출'
    },
    {
      icon: '📋',
      title: '코호트 연구',
      description: '상대위험도(RR) 및 발병률(Incidence Rate) 산출, 0셀 발생 시 Haldane 보정(0.5)을 적용한 로버스트한 통계 분석'
    }
  ],

  // 시스템 특징
  systemFeatures: [
    '가상 스크롤 & Web Worker 기반 대용량 처리',
    '입력 데이터 실시간 유효성 검증 (Debounced)',
    'jStat 라이브러리 활용 정밀 통계분석',
    '교차분석: Fisher 정확검정 / Yates 보정 자동 선택',
    '구간추정: Log-scale 변환 95% 신뢰구간 (CI)',
    '보고서 자동 생성 및 실시간 미리보기',
    'ECharts 기반 고성능 데이터 시각화',
    '반응형 웹 디자인 (PC/Tablet 지원)'
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
      { role: '통계 검증 및 자문 (전문의)', name: '양정호' },
      { role: '총괄 시스템 개발 및 설계', name: '최인규' }
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
    department: '예방의학교실',
    // 기술 지원 팀
    support: [
      { name: '양정호', role: '책임' },
      { name: '최인규', role: '연구원', phone: '061-372-4175' }
    ],
    // 이메일 문의 목록
    emails: [
      'chldlsrb07@gmail.com'
    ]
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
    if (!savedConfig) return { ...siteConfig };
    
    const parsed = JSON.parse(savedConfig);
    
    // Deep merge to ensure schema safety for new fields
    return {
      ...siteConfig,
      ...parsed,
      basic: { ...siteConfig.basic, ...parsed.basic },
      organization: { ...siteConfig.organization, ...parsed.organization },
      contact: { ...siteConfig.contact, ...parsed.contact }
    };
  } catch (error) {
    console.error('설정 로드 실패:', error);
    return { ...siteConfig };
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