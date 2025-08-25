# 사이트 설정 관리 가이드

## 개요

Easy-Epidemiology Web 시스템은 이제 **동적 설정 관리 시스템**을 통해 하드코딩된 정보 없이 관리자가 직접 사이트 정보를 수정할 수 있습니다.

## 주요 개선사항

### 1. 하드코딩된 정보 문제 해결 ✅

**이전 문제점:**
- 모든 사이트 정보가 컴포넌트에 하드코딩됨
- 정보 변경 시 코드 수정 및 재배포 필요
- 관리자가 직접 내용 변경 불가

**해결 방안:**
- 중앙 설정 파일 (`src/config/siteConfig.js`) 기반 관리
- 관리자 패널을 통한 실시간 설정 변경
- 로컬 스토리지를 통한 설정 저장

### 2. Material Icons 외부 의존성 해결 ✅

**이전 문제점:**
- Google CDN에 의존하여 네트워크 지연 발생
- CDN 서비스 중단 시 아이콘 로드 실패

**해결 방안:**
- Material Icons 폰트 파일 로컬 호스팅
- 자동 폰트 다운로드 스크립트
- 폴백 시스템으로 안정성 확보

## 설정 관리 방법

### 관리자 패널 접근

1. 로그인 후 관리자 권한으로 접속
2. "사이트 설정" 탭 클릭
3. 각 섹션별로 정보 수정

### 관리 가능한 설정 항목

#### 기본 정보
- 제목 (예: "Easy-Epidemiology Web v1.3")
- 부제목 (예: "감염병 역학조사 전문 플랫폼")
- 설명
- 버전
- 최종 업데이트 날짜
- 플랫폼 정보

#### 조직 정보
- 기관명
- 부서명
- 섹터명
- 팀원 정보 (역할, 이름)

#### 기능 카드
- 아이콘 (이모지)
- 제목
- 설명

#### 시스템 특징
- 시스템의 주요 특징 목록

### 설정 저장 및 복원

#### 설정 저장
- "설정 저장" 버튼 클릭
- 변경사항이 즉시 적용됨
- 페이지 새로고침으로 모든 사용자에게 반영

#### 기본값 복원
- "기본값으로 복원" 버튼 클릭
- 확인 후 원본 설정으로 복원

## 기술적 구현

### 설정 파일 구조

```javascript
// src/config/siteConfig.js
export const siteConfig = {
  basic: {
    title: "Easy-Epidemiology Web v1.3",
    subtitle: "감염병 역학조사 전문 플랫폼",
    // ...
  },
  features: [
    {
      icon: "📊",
      title: "데이터 입력 & 검증",
      description: "..."
    }
    // ...
  ],
  // ...
};
```

### 설정 관리 함수

```javascript
// 설정 로드
import { loadSiteConfig } from '@/config/siteConfig';
const config = loadSiteConfig();

// 설정 업데이트
import { updateSiteConfig } from '@/config/siteConfig';
updateSiteConfig(newConfig);

// 설정 초기화
import { resetSiteConfig } from '@/config/siteConfig';
resetSiteConfig();
```

## Material Icons 로컬 호스팅

### 자동 설치

```bash
# 프로젝트 설치 시 자동으로 폰트 다운로드
npm install

# 수동으로 폰트 다운로드
npm run download-icons
```

### 폰트 파일 위치

```
public/
├── fonts/
│   ├── MaterialIcons-Regular.woff2
│   ├── MaterialIcons-Regular.woff
│   ├── MaterialIcons-Regular.ttf
│   ├── MaterialIconsOutlined-Regular.woff2
│   ├── MaterialIconsOutlined-Regular.woff
│   └── MaterialIconsOutlined-Regular.ttf
└── material-icons.css
```

### 폴백 시스템

로컬 폰트 로드 실패 시 자동으로 Google CDN으로 폴백하여 안정성 확보

## 사용자 경험 개선

### 관리자 관점
- ✅ 코드 수정 없이 정보 변경 가능
- ✅ 실시간 설정 적용
- ✅ 직관적인 관리 인터페이스
- ✅ 설정 백업 및 복원 기능

### 사용자 관점
- ✅ 항상 최신 정보 제공
- ✅ 빠른 페이지 로딩 (로컬 아이콘)
- ✅ 안정적인 아이콘 표시
- ✅ 네트워크 의존성 최소화

## 배포 시 고려사항

### 설정 백업
- 배포 전 현재 설정 백업 권장
- `localStorage`의 `siteConfig` 키 확인

### 폰트 파일 포함
- `public/fonts/` 디렉토리가 배포에 포함되는지 확인
- `material-icons.css` 파일 포함 확인

## 문제 해결

### 설정이 적용되지 않는 경우
1. 브라우저 캐시 삭제
2. 페이지 새로고침
3. 관리자 권한 확인

### 아이콘이 표시되지 않는 경우
1. 폰트 파일 존재 확인
2. 네트워크 연결 확인
3. 폴백 시스템 작동 확인

## 향후 개선 계획

- [ ] 설정 내보내기/가져오기 기능
- [ ] 설정 버전 관리
- [ ] 다국어 지원
- [ ] 설정 변경 이력 추적
- [ ] API 기반 설정 관리 (서버 연동)

---

**참고:** 이 가이드는 시스템 관리자를 위한 문서입니다. 개발자 문서는 별도로 제공됩니다. 