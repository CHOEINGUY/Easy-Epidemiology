# Cloudflare Workers 인증 시스템 배포 가이드

## 1. 사전 준비

### Cloudflare 계정 설정
1. [Cloudflare Dashboard](https://dash.cloudflare.com)에 로그인
2. Workers & Pages 섹션으로 이동
3. "Create application" 클릭하여 새 Worker 생성

### Wrangler CLI 설치
```bash
npm install -g wrangler
wrangler login
```

## 2. KV 네임스페이스 생성

### 프로덕션 KV 생성
```bash
wrangler kv:namespace create "AUTH_KV"
```

### 개발용 KV 생성
```bash
wrangler kv:namespace create "AUTH_KV" --preview
```

### 생성된 ID 확인
```bash
wrangler kv:namespace list
```

## 3. wrangler.toml 설정

생성된 KV ID를 `wrangler.toml`에 입력:

```toml
name = "epidemiology-auth-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "epidemiology-auth-worker"

[[kv_namespaces]]
binding = "AUTH_KV"
id = "실제_생성된_ID"  # 여기에 실제 ID 입력
preview_id = "개발용_ID"  # 여기에 개발용 ID 입력

[vars]
ENVIRONMENT = "production"
JWT_SECRET = "your-super-secret-jwt-key-change-in-production"

[env.development]
name = "epidemiology-auth-worker-dev"

[[env.development.kv_namespaces]]
binding = "AUTH_KV"
preview_id = "개발용_ID"

[env.development.vars]
ENVIRONMENT = "development"
JWT_SECRET = "dev-jwt-secret-key"
```

## 4. 로컬 개발 및 테스트

### 개발 서버 실행
```bash
cd worker
wrangler dev
```

### API 테스트
브라우저 콘솔에서:
```javascript
// test-api.js 로드 후
testAPI()
```

## 5. 초기 관리자 계정 생성

### 방법 1: KV에서 직접 생성
```bash
# 관리자 계정 데이터 생성
wrangler kv:key put --binding=AUTH_KV "user:admin" '{
  "id": "admin_001",
  "username": "admin",
  "email": "admin@example.com",
  "password": "$2a$10$hashed_password_here",
  "role": "admin",
  "approved": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}'

# 이메일 인덱스 생성
wrangler kv:key put --binding=AUTH_KV "email:admin@example.com" "admin_001"
```

### 방법 2: 스크립트로 생성
```javascript
// admin-setup.js
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash('admin123', 10);
const adminData = {
  id: 'admin_001',
  username: 'admin',
  email: 'admin@example.com',
  password: hashedPassword,
  role: 'admin',
  approved: true,
  createdAt: new Date().toISOString()
};

// KV에 저장
await AUTH_KV.put('user:admin', JSON.stringify(adminData));
await AUTH_KV.put('email:admin@example.com', 'admin_001');
```

## 6. 프로덕션 배포

### 배포 실행
```bash
wrangler deploy
```

### 배포 확인
```bash
wrangler tail
```

## 7. 프론트엔드 연동

### API URL 업데이트
`src/services/authApi.js`에서 API_BASE URL을 실제 배포된 URL로 변경:

```javascript
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';
```

### 환경별 설정
```javascript
// 개발 환경
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8787'
  : 'https://your-worker.your-subdomain.workers.dev';
```

## 8. 보안 설정

### JWT Secret 변경
프로덕션에서 강력한 JWT 시크릿 키 사용:
```bash
# 랜덤 시크릿 생성
openssl rand -base64 32
```

### CORS 설정
필요한 도메인만 허용하도록 설정:
```javascript
// utils.js에서
'Access-Control-Allow-Origin': 'https://your-domain.com'
```

## 9. 모니터링 및 로그

### 실시간 로그 확인
```bash
wrangler tail --format=pretty
```

### 에러 모니터링
Cloudflare Dashboard에서 Workers 메트릭 확인

## 10. 백업 및 복구

### KV 데이터 백업
```bash
# 전체 KV 데이터 내보내기
wrangler kv:key list --binding=AUTH_KV > kv-backup.json
```

### 데이터 복구
```bash
# 백업에서 복구
wrangler kv:bulk put --binding=AUTH_KV kv-backup.json
```

## 11. 문제 해결

### 일반적인 문제들

#### CORS 오류
- 프론트엔드 도메인이 CORS 설정에 포함되어 있는지 확인
- 개발 환경에서는 `*` 허용 가능

#### KV 접근 오류
- wrangler.toml의 KV ID가 올바른지 확인
- KV 네임스페이스가 생성되었는지 확인

#### JWT 오류
- JWT 시크릿 키가 올바른지 확인
- 토큰 만료 시간 확인

### 디버깅 팁
```bash
# 상세 로그 확인
wrangler dev --log-level=debug

# 특정 요청 추적
wrangler tail --format=json | jq
```

## 12. 성능 최적화

### KV 쿼리 최적화
- 필요한 데이터만 조회
- 인덱스 활용 (email, username 등)

### 캐싱 전략
- 자주 조회되는 데이터 캐싱
- 토큰 검증 결과 캐싱

## 13. 비용 관리

### 무료 티어 한도
- 100,000 요청/일
- 1GB KV 저장소
- 10GB 대역폭

### 사용량 모니터링
Cloudflare Dashboard에서 실시간 사용량 확인

## 14. 업데이트 및 유지보수

### 코드 업데이트
```bash
# 새 버전 배포
wrangler deploy

# 롤백 (필요시)
wrangler rollback
```

### 의존성 업데이트
```bash
npm update
npm audit fix
```

## 15. 지원 및 문서

### 공식 문서
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [KV Storage Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)

### 커뮤니티
- [Cloudflare Community](https://community.cloudflare.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cloudflare-workers) 