import {
  successResponse,
  errorResponse,
  parseRequestBody,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateUserId,
  validateRegistrationData,
  corsHeaders
} from './utils.js';

// 사용자명 중복 확인 (실시간 체크)
export async function handleCheckUsername(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const body = await parseRequestBody(request);
  if (!body || !body.username) {
    return errorResponse('사용자명이 필요합니다.');
  }

  const { username } = body;

  // 사용자명 형식 검증
  if (username.length < 3 || username.length > 20) {
    return errorResponse('사용자명은 3-20자 사이여야 합니다.');
  }

  try {
    // 사용자명 중복 확인
    const existingUser = await env.AUTH_KV.get(`user:${username}`);
    
    if (existingUser) {
      return successResponse(
        { available: false, message: '이미 사용 중인 사용자명입니다.' },
        '사용자명 중복'
      );
    } else {
      return successResponse(
        { available: true, message: '사용 가능한 사용자명입니다.' },
        '사용자명 사용 가능'
      );
    }

  } catch (error) {
    console.error('Username check error:', error);
    return errorResponse('사용자명 확인 중 오류가 발생했습니다.', 500);
  }
}

// 사용자 등록
export async function handleRegister(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const body = await parseRequestBody(request);
  if (!body) {
    return errorResponse('Invalid request body');
  }

  // 입력 데이터 검증
  const validation = validateRegistrationData(body);
  if (!validation.valid) {
    return errorResponse(validation.message);
  }

  const { username, password, email, organization, phone, name } = body;

  try {
    // 사용자명 중복 확인
    const existingUser = await env.USERS.get(`user:${username}`);
    if (existingUser) {
      return errorResponse('이미 존재하는 사용자명입니다.');
    }

    // 이메일 중복 확인
    const existingEmail = await env.USERS.get(`email:${email}`);
    if (existingEmail) {
      return errorResponse('이미 등록된 이메일 주소입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);
    
    // 사용자 ID 생성
    const userId = generateUserId();
    
    // 사용자 데이터 생성
    const userData = {
      id: userId,
      username,
      name: name || '', // 사용자 이름
      email,
      organization,
      phone: phone || null, // 전화번호는 선택사항
      password: hashedPassword,
      role: 'pending', // 승인 대기 상태
      createdAt: new Date().toISOString(),
      approved: false
    };

    // KV에 저장
    await env.USERS.put(`user:${username}`, JSON.stringify(userData));
    await env.USERS.put(`email:${email}`, userId);
    await env.USERS.put(`pending:${userId}`, JSON.stringify(userData));

    return successResponse(
      { userId, username, email, organization },
      '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.'
    );

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('회원가입 중 오류가 발생했습니다.', 500);
  }
}

// 사용자 로그인
export async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const body = await parseRequestBody(request);
  if (!body) {
    return errorResponse('Invalid request body');
  }

  const { username, password } = body;

  if (!username || !password) {
    return errorResponse('사용자명과 비밀번호를 입력해주세요.');
  }

  try {
    // 사용자 정보 조회
    const userDataStr = await env.USERS.get(`user:${username}`);
    console.log('User data string:', userDataStr);
    
    if (!userDataStr) {
      return errorResponse('사용자명 또는 비밀번호가 올바르지 않습니다.');
    }

    let userData;
    try {
      userData = JSON.parse(userDataStr);
    } catch (parseError) {
      // JSON 파싱 실패 시, 문자열을 직접 파싱
      console.log('JSON parse failed, trying manual parse...');
      const cleanDataStr = userDataStr.replace(/^'|'$/g, ''); // 앞뒤 따옴표 제거
      const matches = cleanDataStr.match(/(\w+):([^,}]+)/g);
      userData = {};
      matches.forEach(match => {
        const [key, value] = match.split(':');
        userData[key.trim()] = value.trim().replace(/^"|"$/g, ''); // 따옴표 제거
      });
    }
    console.log('Parsed user data:', JSON.stringify(userData, null, 2));

    // 승인 상태 확인
    console.log('isApproved:', userData.isApproved, 'approved:', userData.approved);
    if (!userData.isApproved && !userData.approved) {
      return errorResponse('아직 승인되지 않은 계정입니다. 관리자 승인을 기다려주세요.');
    }

    // 비밀번호 검증
    const storedPassword = userData.hashedPassword || userData.password;
    console.log('Stored password field:', userData.hashedPassword ? 'hashedPassword' : 'password');
    const isValidPassword = await verifyPassword(password, storedPassword);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      return errorResponse('사용자명 또는 비밀번호가 올바르지 않습니다.');
    }

    // JWT 토큰 생성
    const token = await generateToken(userData.id, userData.role);

    return successResponse({
      token,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      }
    }, '로그인 성공');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('로그인 중 오류가 발생했습니다.', 500);
  }
}

// 토큰 검증
export async function handleVerifyToken(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const body = await parseRequestBody(request);
  if (!body || !body.token) {
    return errorResponse('토큰이 필요합니다.');
  }

  try {
    const decoded = await verifyToken(body.token);
    if (!decoded) {
      return errorResponse('유효하지 않은 토큰입니다.', 401);
    }

    // 사용자 정보 조회
    const pendingUsers = await env.USERS.list({ prefix: 'pending:' });
    let userData = null;

    for (const key of pendingUsers.keys) {
      const userStr = await env.USERS.get(key.name);
      const user = JSON.parse(userStr);
      if (user.id === decoded.userId) {
        userData = user;
        break;
      }
    }

    if (!userData) {
      // 승인된 사용자에서 찾기
      const allUsers = await env.USERS.list({ prefix: 'user:' });
      for (const key of allUsers.keys) {
        const userStr = await env.USERS.get(key.name);
        const user = JSON.parse(userStr);
        if (user.id === decoded.userId) {
          userData = user;
          break;
        }
      }
    }

    if (!userData) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404);
    }

    return successResponse({
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        approved: userData.approved
      }
    }, '토큰 검증 성공');

  } catch (error) {
    console.error('Token verification error:', error);
    return errorResponse('토큰 검증 중 오류가 발생했습니다.', 500);
  }
}

// CORS 처리
export function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
} 