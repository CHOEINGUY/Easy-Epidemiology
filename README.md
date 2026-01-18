# 🔬 Easy Epidemiology

> **역학조사 데이터 분석 웹 애플리케이션**  
> 보건 전문가를 위한 역학조사 분석 도구

[![CI Pipeline](https://github.com/CHOEINGUY/Easy-Epidemiology/actions/workflows/ci.yml/badge.svg)](https://github.com/CHOEINGUY/Easy-Epidemiology/actions/workflows/ci.yml)
[![Vue 3](https://img.shields.io/badge/Vue-3.2-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-3.0-FFDD57?style=flat-square)](https://pinia.vuejs.org/)
[![Vuetify](https://img.shields.io/badge/Vuetify-3.7-1867C0?style=flat-square&logo=vuetify)](https://vuetifyjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

---

## 📖 개요

Easy Epidemiology는 역학조사 업무를 간소화하기 위한 웹 애플리케이션입니다. 역학조사관과 보건 담당자에게 다음 기능을 제공합니다:

- 역학조사 데이터 입력 및 관리
- 통계 분석 수행 (환자-대조군, 코호트, 사례계열 연구)
- 유행곡선 및 임상증상 분포 시각화
- 표준화된 조사 보고서 자동 생성 (HWPX 형식)

### 🎯 대상 사용자

- **역학조사관**
- **보건소 담당자**
- **감염병 연구원**

---

## ✨ 주요 기능

| 기능                     | 설명                                                     |
| ------------------------ | -------------------------------------------------------- |
| 📊 **가상스크롤 그리드** | 수천 건의 레코드를 가상화 렌더링으로 고성능 입력         |
| 👤 **환자특성**          | 사용자 정의 환자 특성별 통계표 생성 및 시각화            |
| 📈 **유행곡선**          | 잠복기 분석이 포함된 대화형 유행곡선 시각화              |
| 🩺 **임상증상**          | 발병률 분석 및 증상 빈도 차트                            |
| 🔬 **환자-대조군 연구**  | 교차비(OR) 계산, 95% 신뢰구간, 카이제곱 검정             |
| 📋 **코호트 연구**       | 상대위험도(RR) 계산, 기여위험도 분석                     |
| 📁 **사례계열 연구**     | 유행조사를 위한 개별 노출 시간 분석                      |
| 📝 **보고서 자동생성**   | HWPX(한글) 형식 보고서 자동 생성                         |
| 🌐 **다국어 지원**       | vue-i18n을 통한 한국어/영어 지원                         |
| 🔓 **인증 없음 모드**    | 폐쇄망(보건소 등) 및 오프라인 파일 환경 지원 (`file://`) |

---

## 🛠️ 기술 스택

### 프론트엔드

- **프레임워크**: Vue 3 (Composition API + `<script setup>`)
- **언어**: TypeScript 5.9
- **상태관리**: Pinia 3.0
- **라우팅**: Vue Router 4
- **UI 프레임워크**: Vuetify 3 + TailwindCSS 3.4
- **차트**: ECharts
- **다국어**: vue-i18n 9

### 데이터 처리

- **통계**: jstat (통계 계산)
- **엑셀**: xlsx (가져오기/내보내기)
- **문서**: JSZip + hwp.js (HWPX 보고서 생성)
- **데이터 그리드**: vue-virtual-scroller

### 개발 환경

- **빌드 도구**: Vue CLI 5
- **테스트**: Jest + Vue Test Utils + Playwright
- **린팅**: ESLint + Prettier
- **CSS**: PostCSS + Autoprefixer

### 백엔드 (선택사항)

- **인증 API**: Cloudflare Workers (TypeScript)
- **데이터베이스**: Cloudflare KV (인증 데이터 저장)

---

## 🚀 시작하기

### 필수 조건

- Node.js 18+
- npm 9+

### 설치

```bash
# 저장소 복제
git clone https://github.com/CHOEINGUY/Easy-Epidemiology.git
cd Easy-Epidemiology

# 의존성 설치 (Material Icons 자동 다운로드)
npm install
```

### 개발 서버

```bash
# 개발 서버 시작 (인증 모드)
npm run serve

# 개발 서버 시작 (인증 없음 - 공개 접근)
npm run serve:noauth
```

앱은 `http://localhost:8080`에서 사용 가능합니다.

---

## 📦 빌드 모드

| 명령어                 | 모드            | 설명                                                     |
| ---------------------- | --------------- | -------------------------------------------------------- |
| `npm run build`        | 프로덕션 (인증) | Cloudflare Workers 인증 필요                             |
| `npm run build:noauth` | 인증 없음       | 폐쇄망(보건소 등) 및 오프라인 파일 환경 지원 (`file://`) |

### 배포용 빌드

```bash
# Cloudflare Pages (인증 필요)
npm run build:auth

# 정적 호스팅 (인증 없음)
npm run build:noauth
```

---

## 📁 프로젝트 구조

```
webpage_office/
├── public/                     # 정적 자원
│   ├── fonts/                  # Pretendard, Material Icons
│   ├── demo/                   # 샘플 데이터 파일
│   └── report_template*.zip    # HWPX 보고서 템플릿
├── src/
│   ├── auth/                   # 인증 (AuthManager, UserManager)
│   ├── components/
│   │   ├── AdminPanel/         # 관리자 대시보드
│   │   ├── AuthScreen/         # 로그인/회원가입 UI
│   │   ├── CaseControl/        # 환자-대조군 분석
│   │   ├── CaseSeries/         # 사례계열 분석
│   │   ├── ClinicalSymptoms/   # 임상증상 분석
│   │   ├── CohortStudy/        # 코호트 연구 분석
│   │   ├── DataInputVirtualScroll/  # 메인 데이터 그리드 (53개 파일)
│   │   ├── EpidemicCurve/      # 유행곡선 차트
│   │   ├── PatientCharacteristics/  # 인구통계
│   │   ├── ReportWriter/       # HWPX 보고서 생성기
│   │   └── UserManual/         # 사용자 가이드
│   ├── i18n/                   # 번역 (ko, en)
│   ├── stores/                 # Pinia 스토어
│   ├── types/                  # TypeScript 정의
│   ├── utils/                  # 유틸리티 함수
│   └── validation/             # 데이터 검증 로직
├── tests/                      # Jest 단위 테스트
├── worker/                     # Cloudflare Workers (인증 API)
└── e2e/                        # Playwright E2E 테스트
```

---

## 🧪 테스트

```bash
# 모든 단위 테스트 실행
npm test

# 커버리지와 함께 테스트 실행
npm test -- --coverage

# 특정 테스트 파일 실행
npm test -- --testPathPattern="gridStore"
```

### 현재 테스트 커버리지

| 영역                          | 상태               |
| ----------------------------- | ------------------ |
| 스토어 (dataLogic, gridStore) | ✅ 완료            |
| 검증 로직                     | ✅ 완료            |
| 컴포저블 (useEpidemicStats)   | ✅ 완료            |
| 컴포넌트                      | ✅ 완료 (E2E 통해) |
| E2E 시나리오                  | ✅ 완료            |

---

## 📄 사용 가능한 스크립트

| 스크립트                  | 설명                               |
| ------------------------- | ---------------------------------- |
| `npm run serve`           | 개발 서버 시작 (인증 모드)         |
| `npm run serve:noauth`    | 개발 서버 시작 (인증 없음)         |
| `npm run build`           | 프로덕션 빌드                      |
| `npm run lint`            | ESLint 실행                        |
| `npm test`                | Jest 테스트 실행                   |
| `npm run download-icons`  | 오프라인용 Material Icons 다운로드 |
| `npm run embed-templates` | 보고서 템플릿 Base64 임베드        |

---

## 🌐 다국어 지원

앱에서 지원하는 언어:

- 🇰🇷 **한국어** - 기본
- 🇺🇸 **영어**

UI 언어 전환 버튼으로 변경 가능합니다.

번역 파일 위치: `src/i18n/locales/`

---

## 🔐 인증 모드

### 인증 모드 (기본)

- Cloudflare Workers 백엔드 필요
- 관리자 승인 후 회원가입
- 역할 기반 접근 제어 (admin, support, user)

### 인증 없음 모드 (폐쇄망/오프라인용)

- **보건소 등 폐쇄망 환경**을 위한 오프라인 빌드
- `file://` 프로토콜 또는 로컬 환경에서 인증 없이 즉시 실행
- 외부 인터넷 연결 불필요

---

## 📊 통계 분석 방법

### 환자-대조군 연구

- **교차비(OR)** 95% 신뢰구간
- 카이제곱 검정 및 p-value
- 소표본을 위한 Fisher 정확 검정

### 코호트 연구

- **상대위험도(RR)** 95% 신뢰구간
- 발병률 비교
- 기여위험도(AR)

### 유행곡선 분석

- 잠복기 추정 (중앙값, 범위)
- 유행 타임라인 시각화
- 피크 탐지

---

## 🤝 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

---

## 📝 라이선스

이 프로젝트는 공중보건 연구 및 교육 목적으로 개발되었습니다.

---

## 👨‍💻 저자

**최인규 (Ingyu Choi)**

- 역학조사관 & 풀스택 개발자
- 공중보건 업무 현대화를 위한 도구 개발

---

<p align="center">
  <sub>공중보건 전문가들을 위해 ❤️로 제작</sub>
</p>
