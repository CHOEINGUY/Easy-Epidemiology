#!/usr/bin/env node

/**
 * 로그인/비로그인 모드 테스트 스크립트
 * 
 * 사용법:
 * node test-modes.js auth     # 로그인 모드 테스트
 * node test-modes.js noauth   # 비로그인 모드 테스트
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2];

if (!mode || !['auth', 'noauth'].includes(mode)) {
  console.log('❌ 사용법: node test-modes.js [auth|noauth]');
  console.log('');
  console.log('예시:');
  console.log('  node test-modes.js auth    # 로그인 모드 테스트');
  console.log('  node test-modes.js noauth  # 비로그인 모드 테스트');
  process.exit(1);
}

console.log(`🧪 ${mode === 'auth' ? '로그인' : '비로그인'} 모드 테스트 시작...`);

// 환경 변수 파일 확인
const envFile = mode === 'auth' ? 'env.development' : 'env.noauth';
if (!fs.existsSync(envFile)) {
  console.log(`❌ 환경 변수 파일이 없습니다: ${envFile}`);
  process.exit(1);
}

// package.json 확인
if (!fs.existsSync('package.json')) {
  console.log('❌ package.json 파일이 없습니다.');
  process.exit(1);
}

try {
  // 환경 변수 파일을 .env로 복사
  fs.copyFileSync(envFile, '.env');
  console.log(`✅ 환경 변수 파일 복사 완료: ${envFile} → .env`);
  
  // 환경 변수 내용 출력
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('📋 환경 변수 설정:');
  console.log(envContent);
  
  // 개발 서버 시작
  const command = mode === 'auth' ? 'npm run serve' : 'npm run serve:noauth';
  console.log(`🚀 개발 서버 시작: ${command}`);
  
  execSync(command, { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ 테스트 실행 중 오류 발생:', error.message);
  process.exit(1);
} finally {
  // .env 파일 정리
  if (fs.existsSync('.env')) {
    fs.unlinkSync('.env');
    console.log('🧹 .env 파일 정리 완료');
  }
} 