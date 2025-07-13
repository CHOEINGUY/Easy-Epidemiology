# Epidemiology Auth Worker

Cloudflare Workers 기반 사용자 인증 및 승인 시스템입니다.

## 기능

- 사용자 회원가입 (승인 대기)
- 관리자 승인/거부 시스템
- JWT 기반 인증
- bcrypt 비밀번호 해싱
- Cloudflare KV 저장소 활용

## 배포 방법

### 1. Cloudflare 계정 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에 로그인
2. Workers & Pages 섹션으로 이동
3. "Create application" 클릭

### 2. KV 네임스페이스 생성

```bash
# KV 네임스페이스 생성
wrangler kv:namespace create "AUTH_KV"

# 개발용 네임스페이스 생성
wrangler kv:namespace create "AUTH_KV" --preview
```

### 3. wrangler.toml 업데이트

생성된 KV 네임스페이스 ID를 `wrangler.toml`에 입력:

```toml
[[kv_namespaces]]
binding = "AUTH_KV"
id = "실제_생성된_ID"  # 여기에 실제 ID 입력
preview_id = "개발용_ID"  # 여기에 개발용 ID 입력
```

### 4. 배포

```bash
# 개발 환경 테스트
wrangler dev

# 프로덕션 배포
wrangler deploy
```

## API 엔드포인트

### 인증 API

#### 회원가입
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com"
}
```

#### 로그인
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### 토큰 검증
```http
POST /api/auth/verify
Content-Type: application/json

{
  "token": "jwt_token_here"
}
```

### 관리자 API

모든 관리자 API는 `Authorization: Bearer <admin_token>` 헤더가 필요합니다.

#### 승인 대기 사용자 목록
```http
GET /api/admin/pending-users
Authorization: Bearer <admin_token>
```

#### 사용자 승인
```http
POST /api/admin/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id_here"
}
```

#### 사용자 거부
```http
POST /api/admin/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id_here"
}
```

#### 전체 사용자 목록
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

#### 사용자 삭제
```http
DELETE /api/admin/delete-user?userId=user_id_here
Authorization: Bearer <admin_token>
```

### 헬스체크
```http
GET /api/health
```

## 초기 관리자 계정 생성

첫 번째 관리자 계정을 생성하려면:

1. 일반 사용자로 회원가입
2. KV 저장소에서 직접 사용자 역할을 'admin'으로 변경
3. 또는 관리자 생성 스크립트 실행

```javascript
// KV에서 직접 관리자 권한 부여
const userData = {
  id: "user_id",
  username: "admin",
  email: "admin@example.com",
  password: "hashed_password",
  role: "admin",
  approved: true,
  createdAt: "2024-01-01T00:00:00.000Z"
};

await AUTH_KV.put(`user:admin`, JSON.stringify(userData));
```

## 보안 고려사항

1. **JWT Secret**: 프로덕션에서 강력한 JWT 시크릿 키 사용
2. **HTTPS**: Cloudflare Workers는 자동으로 HTTPS 제공
3. **비밀번호 해싱**: bcrypt로 안전하게 해싱
4. **CORS**: 필요한 도메인만 허용하도록 설정

## 비용

Cloudflare Workers 무료 티어:
- 100,000 요청/일
- 1GB KV 저장소
- 소규모 팀에 충분

## 프론트엔드 연동

Vue.js 앱에서 사용 예시:

```javascript
// API 기본 URL 설정
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';

// 회원가입
async function register(userData) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
}

// 로그인
async function login(credentials) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return response.json();
}
```

## 문제 해결

### 일반적인 오류

1. **KV 네임스페이스 오류**: wrangler.toml의 ID 확인
2. **CORS 오류**: 프론트엔드 도메인 확인
3. **JWT 오류**: 토큰 만료 또는 잘못된 시크릿 키

### 로그 확인

```bash
# 실시간 로그 확인
wrangler tail
```

## 개발 환경

```bash
# 로컬 개발 서버 실행
wrangler dev

# 테스트
npm test
``` 