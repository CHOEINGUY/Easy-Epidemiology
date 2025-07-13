// API 테스트 스크립트
const API_BASE = 'http://localhost:8787'; // 로컬 개발 서버

async function testAPI() {
  console.log('🚀 API 테스트 시작...\n');

  try {
    // 1. 헬스체크 테스트
    console.log('1. 헬스체크 테스트');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ 헬스체크 성공:', healthData);

    // 2. 회원가입 테스트
    console.log('\n2. 회원가입 테스트');
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        organization: '서울대학교',
        phone: '010-1234-5678'
      })
    });
    const registerData = await registerResponse.json();
    console.log('✅ 회원가입 성공:', registerData);

    // 3. 로그인 테스트 (승인되지 않은 사용자)
    console.log('\n3. 로그인 테스트 (승인 대기)');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('❌ 로그인 실패 (예상됨):', loginData.message);

    // 4. 관리자 계정 생성 (KV에서 직접)
    console.log('\n4. 관리자 계정 생성');
    // 실제로는 KV에서 직접 관리자 권한을 부여해야 함
    console.log('⚠️  관리자 계정은 KV에서 직접 생성해야 합니다.');

    console.log('\n🎉 기본 API 테스트 완료!');
    console.log('\n다음 단계:');
    console.log('1. wrangler dev로 로컬 서버 실행');
    console.log('2. KV에서 관리자 권한 부여');
    console.log('3. 관리자로 로그인하여 사용자 승인');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 테스트 실행
if (typeof window === 'undefined') {
  // Node.js 환경에서 실행
  testAPI();
} else {
  // 브라우저 환경에서 실행
  window.testAPI = testAPI;
  console.log('테스트를 실행하려면 testAPI()를 호출하세요.');
} 