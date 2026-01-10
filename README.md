# Easy-Epidemiology Web v2.0 (간편 역학조사 시스템)

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)
![Vue](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-gold?style=for-the-badge&logo=pinia&logoColor=black)
![Jest](https://img.shields.io/badge/-Jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)

> **Advanced Epidemiological Investigation Platform**  
> 감염병 역학조사의 전 과정(데이터 수집, 분석, 시각화, 보고서 작성)을 통합 지원하는 고성능 웹 애플리케이션입니다.

---

## 📖 프로젝트 소개 (Introduction)

**Easy-Epidemiology Web**은 현장 역학조사관들의 업무 효율성을 극대화하기 위해 설계되었습니다.
기존의 수작업 위주 데이터 처리 방식에서 벗어나, 웹 기반의 **실시간 협업, 자동화된 통계 분석, 직관적인 시각화**를 제공합니다.

특히 **대용량 데이터(수천 건 이상의 환자 정보)**를 브라우저 렉 없이 처리하기 위해 **가상 스크롤(Virtual Scroll)**과 **웹 워커(Web Worker)** 기술을 적극 도입하여 최적화된 사용자 경험(UX)을 제공합니다.

---

## 🌟 핵심 기술 및 성과 (Technical Highlights)

이 프로젝트는 단순한 CRUD 애플리케이션을 넘어, 프론트엔드 성능 최적화와 견고한 아키텍처 설계에 집중했습니다.

### 1. 고성능 그리드 시스템 (Performance Optimized Grid)

- **Virtual Scrolling**: `vue-virtual-scroller`와 자체 구현한 렌더링 로직을 결합하여 10,000행 이상의 데이터도 60fps로 부드럽게 스크롤 및 편집 가능.
- **Custom Keyboard Navigation**: 엑셀(Excel)과 유사한 키보드 경험(방향키 이동, 범위 선택, 복사/붙여넣기)을 웹에서 완벽하게 구현.

### 2. 멀티스레드 데이터 처리 (Web Worker Offloading)

- **Problem**: 대용량 엑셀 파일 파싱 및 수만 셀의 유효성 검사(Validation) 시 메인 스레드 블로킹 발생.
- **Solution**: **Web Worker**를 도입하여 무거운 연산 작업을 백그라운드 스레드로 격리. UI 멈춤 현상(Freezing)을 완벽하게 제거하고 사용자 반응성 유지.

### 3. 통계 및 데이터 시각화 (Statistics & Visualization)

- **Epidemic Curve**: 환자의 증상 발현일과 잠복기를 분석하여 ECharts 기반의 대화형(Interactive) 차트로 시각화.
- **Statistical Analysis**: Odds Ratio(OR), Relative Risk(RR), P-value 등 역학 통계 지표 자동 산출 알고리즘 구현.

### 4. 엄격한 품질 관리 (Testing & QA)

- **Unit/Integration Tests**: Jest를 활용하여 핵심 비즈니스 로직(유효성 검사, 스토어 상태 관리, 통계 연산)에 대해 **126개의 테스트 케이스** 작성 및 통과 (Coverage 90%+ for core logic).
- **E2E Tests**: Playwright를 도입하여 실제 사용자 시나리오 기반의 자동화 테스트 환경 구축 (Cross-browser 지원).
- **CI/CD**: GitHub Actions를 통한 자동화된 빌드 및 테스트 파이프라인 구축.

---

## 🏗 시스템 아키텍처 (Architecture)

프로젝트는 모듈 간 결합도를 낮추고 유지보수성을 높이기 위해 철저한 관심사 분리(SoC)를 적용했습니다.

```mermaid
graph TD
    User((User)) --> Client[Frontend (Vue.js 3)]

    subgraph Frontend Logic
        Client --> Components[UI Components]
        Client --> Composables[Composables (Hooks)]

        Composables --> Store[Pinia Store (State)]
        Composables --> Utils[Utility Functions]

        Utils --> Worker[Web Worker (Background Thread)]
    end

    subgraph Features
        Components --> Grid[Virtual Grid System]
        Components --> Charts[ECharts Visualization]
        Components --> Report[Report Generator]
    end

    Worker -.->|Async Validation| Store
    Store --> Grid
```

- **Composables**: 비즈니스 로직을 UI와 분리하여 재사용성 극대화 (`useGridOperations`, `useEpidemicStats` 등).
- **Pinia**: 중앙 집중식 상태 관리로 데이터 일관성 유지.
- **Web Worker**: 데이터 연산 부하 분산.

---

## 🛠 기술 스택 (Tech Stack)

| Category            | Technologies                       |
| ------------------- | ---------------------------------- |
| **Core**            | Vue.js 3, TypeScript, Vite/Webpack |
| **State**           | Pinia                              |
| **Styling**         | Tailwind CSS, SCSS                 |
| **Visualization**   | Apache ECharts, Chart.js           |
| **Data Processing** | SheetJS (Excel), Lodash, Papaparse |
| **Testing**         | Jest, Vue Test Utils, Playwright   |
| **DevOps**          | GitHub Actions, ESLint             |

---

## 🚀 설치 및 실행 (Getting Started)

### Prerequisites

- Node.js v16+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/easy-epidemiology-web.git
cd easy-epidemiology-web
npm install
```

### Development

```bash
# 로컬 개발 서버 실행 (Hot Module Replacement)
npm run serve
```

### Testing

```bash
# 단위 및 통합 테스트 실행
npm test

# E2E 테스트 실행
npx playwright test
```

### Build

```bash
# 프로덕션 빌드
npm run build
```

---

## 📂 폴더 구조 (Directory Structure)

```
src/
├── components/
│   ├── DataInputVirtualScroll/ # [Core] 가상 스크롤 그리드 & 핸들러
│   │   ├── handlers/           # 키보드/마우스 이벤트 핸들러
│   │   ├── renderers/          # 셀 렌더링 로직
│   │   └── parts/              # 그리드 UI 구성요소
│   ├── EpidemicCurve/          # 유행지수 및 잠복기 분석 화면
│   │   ├── composables/        # 차트 데이터 가공 로직
│   │   └── components/         # 유행곡선 차트 컴포넌트
│   ├── AdminPanel/             # 관리자 설정 패널
│   ├── AuthScreen/             # 로그인 및 회원가입
│   └── Common/                 # 공통 UI (모달, 버튼 등)
├── composables/                # 전역 비즈니스 로직
├── stores/                     # Pinia 상태 관리 (gridStore, epidemicStore 등)
├── utils/                      # 순수 함수 유틸리티 (날짜, 포맷팅)
├── worker/                     # Web Worker 스크립트 (백그라운드 연산)
└── router/                     # Vue Router 설정
```

---

## 📄 라이선스 (License)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
