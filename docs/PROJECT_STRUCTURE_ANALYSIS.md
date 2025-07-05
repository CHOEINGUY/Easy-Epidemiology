# 프로젝트 구조 분석 및 추천

## 현재 구조 분석
```
src/
├── components/
│   ├── DataInputVirtualScroll/
│   │   ├── DataInputVirtual.vue
│   │   ├── logic/
│   │   ├── handlers/
│   │   └── ...
│   └── ...
├── store.js (전역 Vuex store)
└── ...
```

## 제안된 옵션들 분석

### 옵션 1: 컴포넌트 내부 store 폴더
```
src/
├── components/
│   ├── DataInputVirtualScroll/ (기존 유지)
│   ├── DataInputAdvanced/ (새로운 폴더)
│   │   ├── DataInputVirtual.vue
│   │   ├── store/
│   │   │   ├── index.js
│   │   │   ├── storageManager.js
│   │   │   ├── historyManager.js
│   │   │   └── dataValidator.js
│   │   ├── logic/
│   │   └── ...
└── store.js (기존 전역 store 유지)
```

#### 장점
✅ 기존 코드 완전 보존  
✅ 독립적 개발 가능  
✅ 롤백 용이  
✅ 컴포넌트별 명확한 책임 분리

#### 단점
❌ 다른 탭에서 데이터 접근 시 복잡함  
❌ 코드 중복 가능성  
❌ Vue.js 관례와 다름  

### 옵션 2: 현재 구조 유지 (src/store.js)
```
src/
├── components/
│   ├── DataInputVirtualScrollNew/
│   │   ├── DataInputVirtual.vue
│   │   ├── storageManager.js
│   │   ├── logic/
│   │   └── ...
├── store.js (기존)
└── store-new.js (새로운 store)
```

#### 장점
✅ 기존 구조와 일관성  
✅ 간단한 구조  
✅ 빠른 개발

#### 단점
❌ src/ 폴더가 복잡해짐  
❌ store 관련 파일들이 분산  
❌ 확장성 제한

### 옵션 3: 중앙화된 store 폴더 (추천)
```
src/
├── components/
│   ├── DataInputVirtualScroll/ (기존 유지)
│   └── DataInputAdvanced/ (새로운 컴포넌트)
│       ├── DataInputVirtual.vue
│       ├── logic/
│       └── ...
├── store/
│   ├── index.js (메인 store)
│   ├── modules/
│   │   ├── epidemiology.js (기존 데이터 모듈)
│   │   └── epidemiologyAdvanced.js (새로운 모듈)
│   ├── plugins/
│   │   ├── storageManager.js
│   │   ├── historyManager.js
│   │   └── dataValidator.js
│   └── utils/
│       ├── dataRecovery.js
│       └── migration.js
└── store.js (기존 - 마이그레이션 후 삭제)
```

## 🎯 최종 추천: 옵션 3 (중앙화된 store 폴더)

### 추천 이유

#### 1. Vue.js 생태계 표준
- 대부분의 Vue.js 프로젝트에서 사용하는 구조
- Vuex 공식 문서에서 권장하는 방식
- 다른 개발자들이 이해하기 쉬움

#### 2. 확장성 및 유지보수성
```javascript
// 모듈화된 구조로 각 기능별 분리
store/
├── modules/
│   ├── epidemiology.js      // 기존 데이터 로직
│   ├── epidemiologyAdvanced.js // 새로운 저장 시스템
│   ├── charts.js            // 차트 관련 (미래 확장)
│   └── settings.js          // 앱 설정 (미래 확장)
└── plugins/
    ├── storageManager.js    // 저장 관리
    ├── historyManager.js    // Undo/Redo
    └── dataValidator.js     // 유효성 검사
```

#### 3. 컴포넌트 간 데이터 공유 용이
```javascript
// 모든 탭에서 쉽게 접근 가능
// 차트 탭
computed: {
  chartData() {
    return this.$store.getters['epidemiologyAdvanced/getChartData'];
  }
}

// 통계 탭  
computed: {
  statistics() {
    return this.$store.getters['epidemiologyAdvanced/getStatistics'];
  }
}
```

#### 4. 점진적 마이그레이션 지원
```javascript
// 1단계: 기존 store.js와 병행
store/
├── index.js (새로운 통합 store)
├── modules/
│   ├── legacy.js (기존 store.js 내용)
│   └── advanced.js (새로운 시스템)

// 2단계: 점진적 이전
// 3단계: 기존 store.js 삭제
```

## 🚀 구체적 개발 계획

### Phase 1: 구조 설정 (30분)
```bash
# 폴더 생성
mkdir src/store
mkdir src/store/modules  
mkdir src/store/plugins
mkdir src/store/utils

# 컴포넌트 폴더 복사
cp -r src/components/DataInputVirtualScroll src/components/DataInputAdvanced
```

### Phase 2: 기존 코드 마이그레이션 (45분)
```javascript
// src/store/modules/legacy.js
// 기존 store.js 내용을 모듈로 변환
export default {
  namespaced: true,
  state: { /* 기존 state */ },
  mutations: { /* 기존 mutations */ },
  actions: { /* 기존 actions */ },
  getters: { /* 기존 getters */ }
};
```

### Phase 3: 새로운 시스템 개발 (5시간)
```javascript
// src/store/modules/epidemiologyAdvanced.js
// 새로운 저장 시스템 + Undo/Redo

// src/store/plugins/storageManager.js  
// 디바운싱 저장 시스템

// src/store/plugins/historyManager.js
// localStorage 기반 Undo/Redo
```

### Phase 4: 컴포넌트 연동 (1시간)
```javascript
// src/components/DataInputAdvanced/DataInputVirtual.vue
// 새로운 store 모듈 사용
computed: {
  ...mapGetters('epidemiologyAdvanced', ['headers', 'rows'])
},
methods: {
  ...mapActions('epidemiologyAdvanced', ['updateCell', 'undo', 'redo'])
}
```

## 📁 최종 프로젝트 구조

```
src/
├── components/
│   ├── DataInputVirtualScroll/ (기존 - 안전 보관)
│   ├── DataInputAdvanced/ (새로운 - 개발 중)
│   ├── HomePage.vue
│   ├── EpidemicCurve.vue
│   └── ...
├── store/
│   ├── index.js (메인 store 설정)
│   ├── modules/
│   │   ├── legacy.js (기존 시스템 - 호환성)
│   │   └── epidemiologyAdvanced.js (새로운 시스템)
│   ├── plugins/
│   │   ├── storageManager.js
│   │   ├── historyManager.js
│   │   └── dataValidator.js
│   └── utils/
│       ├── dataRecovery.js
│       └── migration.js
├── store.js (기존 - 마이그레이션 후 삭제 예정)
└── ...
```

## 🎉 이 구조의 장점

1. **안전한 개발**: 기존 시스템 완전 보존
2. **표준 준수**: Vue.js 생태계 관례 따름  
3. **확장성**: 미래 기능 추가 용이
4. **유지보수성**: 모듈화된 명확한 구조
5. **협업 친화적**: 다른 개발자가 이해하기 쉬움

**결론: src/store/ 폴더 방식을 강력 추천합니다!** 🎯 