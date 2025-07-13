import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const SALT_ROUNDS = 10;

// JWT 토큰 생성
export async function generateToken(userId, role = 'user') {
  try {
    const token = await new SignJWT({ userId, role, iat: Math.floor(Date.now() / 1000) })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(JWT_SECRET));
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    return null;
  }
}

// JWT 토큰 검증
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

// 비밀번호 해싱
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// 비밀번호 검증
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// 성공 응답 생성
export function successResponse(data, message = 'Success') {
  return new Response(JSON.stringify({
    success: true,
    message,
    data
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 에러 응답 생성
export function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    message
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 요청 본문 파싱
export async function parseRequestBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

// 사용자 ID 생성 (간단한 UUID 대체)
export function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 입력 검증
export function validateRegistrationData(data) {
  const { username, password, email, organization, name } = data;
  
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '사용자 이름을 입력해주세요.' };
  }
  
  if (!username || username.length < 3 || username.length > 20) {
    return { valid: false, message: '사용자명은 3-20자 사이여야 합니다.' };
  }
  
  if (!password || password.length < 6) {
    return { valid: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
  }
  
  if (!email || !email.includes('@')) {
    return { valid: false, message: '유효한 이메일 주소를 입력해주세요.' };
  }
  
  if (!organization || organization.trim().length === 0) {
    return { valid: false, message: '소속을 입력해주세요.' };
  }
  
  return { valid: true };
}

// CORS 헤더 설정
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
} 