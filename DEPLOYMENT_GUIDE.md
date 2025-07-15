# 🚀 배포 가이드 - 로그인/비로그인 모드

이 프로젝트는 로그인이 필요한 버전과 필요 없는 버전으로 분리하여 개발할 수 있습니다.

## 📋 모드별 특징

### 🔐 로그인 모드 (기본)
- 사용자 인증 필요
- 관리자 패널 사용 가능
- 데이터 동기화 기능
- 사용자별 데이터 분리

### 🆓 비로그인 모드
- 인증 없이 바로 사용 가능
- 로그인 화면 없음
- 관리자 패널 없음
- 로그아웃 버튼 없음
- 바로 데이터 입력 탭으로 시작
- 로컬 데이터만 사용
- 간단한 배포 및 사용

## 🛠️ 개발 환경 실행

### 로그인 모드로 실행
```bash
npm run serve
# 또는
npm run serve:auth
```

### 비로그인 모드로 실행
```bash
npm run serve:noauth
```

## 🏗️ 빌드 및 배포

### 로그인 모드 빌드
```bash
npm run build:auth
```

### 비로그인 모드 빌드
```bash
npm run build:noauth
```

## 🌍 환경 변수 설정

### 로그인 모드 (env.development, env.production)
```env
VUE_APP_REQUIRE_AUTH=true
VUE_APP_API_BASE_URL=https://your-worker.your-subdomain.workers.dev
VUE_APP_ENABLE_ADMIN_PANEL=true
VUE_APP_ENABLE_DATA_SYNC=true
VUE_APP_ENABLE_USER_MANAGEMENT=true
```

### 비로그인 모드 (env.noauth)
```env
VUE_APP_REQUIRE_AUTH=false
VUE_APP_API_BASE_URL=
VUE_APP_ENABLE_ADMIN_PANEL=false
VUE_APP_ENABLE_DATA_SYNC=false
VUE_APP_ENABLE_USER_MANAGEMENT=false
```

## 📦 Cloudflare Pages 배포

### 1. 로그인 모드 배포
1. GitHub 저장소에 로그인 모드 빌드 결과물을 푸시
2. Cloudflare Pages에서 빌드 설정:
   - Build command: `npm run build:auth`
   - Build output directory: `dist`

### 2. 비로그인 모드 배포
1. GitHub 저장소에 비로그인 모드 빌드 결과물을 푸시
2. Cloudflare Pages에서 빌드 설정:
   - Build command: `npm run build:noauth`
   - Build output directory: `dist`

## 🔧 환경별 설정 예시

### 개발 환경
```bash
# 로그인 모드 개발
npm run serve

# 비로그인 모드 개발
npm run serve:noauth
```

### 프로덕션 환경
```bash
# 로그인 모드 배포
npm run build:auth

# 비로그인 모드 배포
npm run build:noauth
```

## 📝 주의사항

1. **비로그인 모드**에서는 다음 기능들이 비활성화됩니다:
   - 사용자 인증 (로그인 화면 없음)
   - 관리자 패널 (탭에 표시되지 않음)
   - 로그아웃 기능 (버튼 없음)
   - 데이터 동기화
   - 사용자별 데이터 분리
   - 앱 시작 시 바로 데이터 입력 탭으로 이동

2. **로그인 모드**에서는 Cloudflare Worker가 필요합니다:
   - 사용자 인증 API
   - 데이터 저장소
   - 관리자 기능

3. **환경 변수**는 빌드 시점에 결정되므로 런타임에 변경할 수 없습니다.

## 🎯 추천 사용 시나리오

### 로그인 모드 사용 시기
- 다중 사용자 환경
- 데이터 보안이 중요한 경우
- 관리자 기능이 필요한 경우
- 데이터 동기화가 필요한 경우

### 비로그인 모드 사용 시기
- 단일 사용자 환경
- 빠른 데모나 테스트
- 오프라인 사용
- 간단한 배포가 필요한 경우 