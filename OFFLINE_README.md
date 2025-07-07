# Easy-Epidemiology Web - 오프라인 실행 가이드

## 🚀 오프라인 빌드 생성

### 1. 프로덕션 빌드 생성
```bash
npm run build
```

### 2. 빌드 결과물 확인
빌드가 완료되면 `dist/` 폴더에 다음 파일들이 생성됩니다:
- `index.html` - 메인 HTML 파일
- `static/` - CSS, JS, 폰트 파일들
- `favicon.ico` - 파비콘
- `sw.js` - Service Worker (오프라인 지원)

## 📁 오프라인 실행 방법

### 방법 1: 파일 직접 열기 (file:/// 프로토콜)
1. `dist/` 폴더를 원하는 위치로 복사
2. `dist/index.html` 파일을 브라우저에서 직접 열기
3. 모든 기능이 오프라인에서 작동

### 방법 2: 로컬 서버 실행
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# Node.js (http-server 설치 필요)
npx http-server dist/ -p 8080
```

### 방법 3: VS Code Live Server
1. VS Code에서 `dist/` 폴더 열기
2. `index.html` 우클릭 → "Open with Live Server"

## 🔧 주요 기능

### ✅ 오프라인에서 작동하는 기능들
- **Excel 파일 업로드/다운로드**
- **데이터 입력 및 편집**
- **데이터 검증**
- **차트 생성**
- **데이터 저장 (LocalStorage)**
- **Undo/Redo 기능**

### 🚫 인터넷 연결이 필요한 기능들
- **Google Fonts** (폴백 폰트 제공)
- **외부 CDN 리소스** (로컬 캐싱)

## 🛠️ 기술적 특징

### 1. 웹 워커 대체
- `file:///` 환경에서 워커 사용 불가
- `requestIdleCallback` 기반 비동기 처리
- UI 블로킹 방지

### 2. Service Worker
- 오프라인 캐싱 지원
- 자동 리소스 캐싱
- 네트워크 오류 시 캐시 사용

### 3. 상대 경로 설정
- `publicPath: './'` 설정
- 절대 경로 없이 모든 리소스 로드

## 🧪 테스트 방법

### 1. 기본 기능 테스트
1. Excel 파일 업로드
2. 데이터 입력
3. 차트 생성
4. 데이터 저장

### 2. 오프라인 테스트
1. 인터넷 연결 끊기
2. 페이지 새로고침
3. 모든 기능 정상 작동 확인

### 3. 대용량 데이터 테스트
1. 1000+ 행 데이터 입력
2. 검증 기능 테스트
3. 성능 확인

## 📝 주의사항

1. **브라우저 호환성**: Chrome, Firefox, Safari, Edge 지원
2. **파일 크기**: 대용량 Excel 파일 처리 시 메모리 사용량 주의
3. **저장 공간**: LocalStorage 용량 제한 (보통 5-10MB)
4. **보안**: `file:///` 환경에서는 일부 브라우저 기능 제한

## 🔄 업데이트 방법

1. 새로운 빌드 생성: `npm run build`
2. 기존 `dist/` 폴더 교체
3. 브라우저 캐시 삭제 (Ctrl+F5)

## 📞 문제 해결

### 문제: Excel 파일 업로드 안됨
- 브라우저 콘솔 확인
- 파일 형식 확인 (.xlsx, .xls)
- 파일 크기 확인

### 문제: 차트가 표시되지 않음
- JavaScript 콘솔 오류 확인
- 데이터 형식 확인
- 브라우저 호환성 확인

### 문제: 데이터 저장 안됨
- LocalStorage 용량 확인
- 브라우저 설정 확인
- 개인정보 보호 모드 해제 