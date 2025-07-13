// 첫 번째 관리자 계정 생성 스크립트
// 이 스크립트는 배포 후 한 번만 실행하면 됩니다

import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';

// 관리자 계정 정보
const ADMIN_CONFIG = {
  username: 'chldlsrb07',
  email: 'chldlsrb07@gmail.com',
  password: 'Taijchoi123!',
  organization: '시스템 관리자',
  phone: ''
};

async function createAdminAccount() {
  try {
    console.log('🔧 관리자 계정 생성 시작...');
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);
    
    // 관리자 데이터 생성
    const adminData = {
      username: ADMIN_CONFIG.username,
      email: ADMIN_CONFIG.email,
      organization: ADMIN_CONFIG.organization,
      phone: ADMIN_CONFIG.phone,
      hashedPassword: hashedPassword,
      role: 'admin',
      isApproved: true,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: 'system'
    };
    
    console.log('✅ 관리자 데이터 생성 완료');
    console.log('📋 관리자 정보:');
    console.log(`   사용자명: ${adminData.username}`);
    console.log(`   이메일: ${adminData.email}`);
    console.log(`   소속: ${adminData.organization}`);
    console.log(`   비밀번호: ${ADMIN_CONFIG.password}`);
    
    // KV에 자동 저장
    console.log('\n🚀 KV에 관리자 계정 저장 중...');
    
    try {
      // 사용자 데이터 저장
      const userKey = `user:${adminData.username}`;
      const userDataJson = JSON.stringify(adminData);
      
      execSync(`wrangler kv key put --binding=USERS "${userKey}" '${userDataJson.replace(/'/g, "\\'")}'`, { 
        stdio: 'inherit',
        encoding: 'utf8'
      });
      
      // 이메일 인덱스 저장
      const emailKey = `email:${adminData.email}`;
      execSync(`wrangler kv key put --binding=USERS "${emailKey}" "admin_001"`, { 
        stdio: 'inherit',
        encoding: 'utf8'
      });
      
      console.log('✅ 관리자 계정이 KV에 성공적으로 저장되었습니다!');
      console.log('🎉 이제 로그인할 수 있습니다!');
      
    } catch (kvError) {
      console.error('❌ KV 저장 실패:', kvError.message);
      console.log('\n📝 수동으로 저장하려면 다음 명령어를 실행하세요:');
      console.log(`wrangler kv key put --binding=USERS "user:${adminData.username}" '${JSON.stringify(adminData)}'`);
      console.log(`wrangler kv key put --binding=USERS "email:${adminData.email}" "admin_001"`);
    }
    
  } catch (error) {
    console.error('❌ 관리자 계정 생성 실패:', error);
  }
}

// 스크립트 실행
createAdminAccount(); 