# 🚀 배포 체크리스트

## 📋 배포 전 확인사항

### 1. Cloudflare 계정 설정
- [ ] Cloudflare 계정 생성 및 로그인
- [ ] Wrangler CLI 설치: `npm install -g wrangler`
- [ ] Wrangler 로그인: `wrangler login`

### 2. KV 네임스페이스 생성
- [ ] 프로덕션 KV 생성: `wrangler kv:namespace create "AUTH_KV"`
- [ ] 개발용 KV 생성: `wrangler kv:namespace create "AUTH_KV" --preview`
- [ ] wrangler.toml에 KV ID 입력

### 3. 보안 설정
- [ ] JWT_SECRET 변경 (강력한 랜덤 키 사용)
- [ ] 관리자 계정 정보 수정 (setup-admin.js)
- [ ] CORS 도메인 설정 (필요시)

### 4. 프론트엔드 설정
- [ ] src/services/authApi.js의 API_BASE URL 업데이트
- [ ] 환경별 API URL 설정 (개발/프로덕션)

## 🚀 배포 단계

### 1단계: 로컬 테스트
```bash
cd worker
wrangler dev
```
- [ ] API 엔드포인트 테스트
- [ ] 회원가입/로그인 테스트
- [ ] 관리자 기능 테스트

### 2단계: 프로덕션 배포
```bash
wrangler deploy
```
- [ ] 배포 성공 확인
- [ ] 배포된 URL 확인

### 3단계: 관리자 계정 생성
```bash
# 방법 1: 스크립트 사용
node setup-admin.js

# 방법 2: 수동 생성
wrangler kv:key put --binding=AUTH_KV "user:admin" '{"admin_data_json"}'
wrangler kv:key put --binding=AUTH_KV "email:admin@example.com" "admin_001"
```

### 4단계: 최종 테스트
- [ ] 관리자 로그인 테스트
- [ ] 일반 사용자 회원가입 테스트
- [ ] 관리자 승인 테스트
- [ ] 승인된 사용자 로그인 테스트

## 🔧 기본 관리자 계정

**초기 정보:**
- 사용자명: `chldlsrb07`
- 비밀번호: `Taijchoi123!`
- 이메일: `chldlsrb07@gmail.com`

**✅ 설정 완료:**
- [ ] 관리자 계정 정보 설정
- [ ] setup-admin.js 파일 삭제 (배포 후)

## 📊 모니터링 설정

### 로그 확인
```bash
# 실시간 로그
wrangler tail --format=pretty

# 에러 로그
wrangler tail --format=json | jq 'select(.level == "error")'
```

### Cloudflare Dashboard
- [ ] Workers 메트릭 확인
- [ ] KV 사용량 확인
- [ ] 에러율 모니터링

## 🆘 문제 해결

### 일반적인 문제들
- **CORS 오류**: 프론트엔드 도메인 확인
- **KV 접근 오류**: KV ID 및 권한 확인
- **JWT 오류**: 시크릿 키 및 토큰 만료 확인

### 디버깅 명령어
```bash
# 상세 로그
wrangler dev --log-level=debug

# 특정 요청 추적
wrangler tail --format=json | jq 'select(.message | contains("error"))'
```

## ✅ 배포 완료 확인

### 기능 테스트 체크리스트
- [ ] 회원가입 (2단계 폼)
- [ ] 실시간 아이디 중복 체크
- [ ] 비밀번호 보이기/숨기기
- [ ] 관리자 로그인
- [ ] 사용자 승인/거부
- [ ] 승인된 사용자 로그인
- [ ] 관리자 패널 기능

### 성능 확인
- [ ] API 응답 시간 < 1초
- [ ] KV 쿼리 성능 확인
- [ ] 에러율 < 1%

## 🎉 배포 완료!

모든 체크리스트 항목이 완료되면 시스템이 정상적으로 운영됩니다. 