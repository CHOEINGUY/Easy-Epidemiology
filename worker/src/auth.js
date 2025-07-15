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

// src/auth.js
async function handleCheckEmail(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const body = await parseRequestBody(request);
  if (!body || !body.email) {
    return errorResponse("이메일이 필요합니다.");
  }
  const { email } = body;
  // 이메일 형식 검증 개선 (@와 . 포함, 도메인 형식 확인)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleanEmail = email.trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    return errorResponse("올바른 이메일 형식이 아닙니다. (@와 도메인이 포함된 형식으로 입력해주세요)");
  }
  try {
    const existingUserId = await env.USERS.get(`email:${email}`);
    if (existingUserId) {
      return successResponse(
        { available: false, message: "이미 사용 중인 이메일입니다." },
        "이메일 중복"
      );
    } else {
      return successResponse(
        { available: true, message: "사용 가능한 이메일입니다." },
        "이메일 사용 가능"
      );
    }
  } catch (error) {
    console.error("Email check error:", error);
    return errorResponse("이메일 확인 중 오류가 발생했습니다.", 500);
  }
}

async function handleCheckPhone(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const body = await parseRequestBody(request);
  if (!body || !body.phone) {
    return errorResponse("전화번호가 필요합니다.");
  }
  const { phone } = body;
  // 전화번호 형식 검증을 더 관대하게 수정
  const phoneRegex = /^(\+82|0)[0-9]{9,10}$/;
  const cleanPhone = phone.replace(/\s/g, "");
  if (!phoneRegex.test(cleanPhone)) {
    return errorResponse("올바른 전화번호 형식이 아닙니다.");
  }
  try {
    const existingUserId = await env.USERS.get(`phone:${cleanPhone}`);
    if (existingUserId) {
      return successResponse(
        { available: false, message: "이미 사용 중인 전화번호입니다." },
        "전화번호 중복"
      );
    } else {
      return successResponse(
        { available: true, message: "사용 가능한 전화번호입니다." },
        "전화번호 사용 가능"
      );
    }
  } catch (error) {
    console.error("Phone check error:", error);
    return errorResponse("전화번호 확인 중 오류가 발생했습니다.", 500);
  }
}

async function handleRegister(request, env) {
  console.log('🚀 [handleRegister] 회원가입 요청 시작');
  
  if (request.method !== "POST") {
    console.log('❌ [handleRegister] 잘못된 HTTP 메서드:', request.method);
    return errorResponse("Method not allowed", 405);
  }
  
  const body = await parseRequestBody(request);
  console.log('📄 [handleRegister] 요청 본문:', body);
  
  if (!body) {
    console.log('❌ [handleRegister] 요청 본문 없음');
    return errorResponse("Invalid request body");
  }
  
  // 새로운 유효성 검사
  const { name, email, phone, password, affiliation, affiliationType } = body;
  console.log('🔍 [handleRegister] 데이터 추출:', { name, email, phone, affiliation, affiliationType });
  
  if (!name || name.trim().length === 0) {
    console.log('❌ [handleRegister] 이름 누락');
    return errorResponse("사용자 이름을 입력해주세요.");
  }
  
  if (!email || !email.includes("@")) {
    console.log('❌ [handleRegister] 이메일 형식 오류');
    return errorResponse("유효한 이메일 주소를 입력해주세요.");
  }
  
  if (!phone) {
    console.log('❌ [handleRegister] 전화번호 누락');
    return errorResponse("전화번호를 입력해주세요.");
  }
  
  if (!password || password.length < 6) {
    console.log('❌ [handleRegister] 비밀번호 길이 부족');
    return errorResponse("비밀번호는 최소 6자 이상이어야 합니다.");
  }
  
  if (!affiliation || affiliation.trim().length === 0) {
    console.log('❌ [handleRegister] 소속 누락');
    return errorResponse("소속을 입력해주세요.");
  }
  
  if (!affiliationType || affiliationType.trim().length === 0) {
    console.log('❌ [handleRegister] 소속 유형 누락');
    return errorResponse("소속 유형을 선택해주세요.");
  }
  
  try {
    console.log('🔍 [handleRegister] 중복 검사 시작');
    
    // 이메일 중복 확인
    const existingEmail = await env.USERS.get(`email:${email}`);
    if (existingEmail) {
      console.log('❌ [handleRegister] 이메일 중복:', email);
      return errorResponse("이미 등록된 이메일 주소입니다.");
    }
    
    // 전화번호 중복 확인
    const cleanPhone = phone.replace(/\s/g, "");
    const existingPhone = await env.USERS.get(`phone:${cleanPhone}`);
    if (existingPhone) {
      console.log('❌ [handleRegister] 전화번호 중복:', cleanPhone);
      return errorResponse("이미 등록된 전화번호입니다.");
    }
    
    console.log('✅ [handleRegister] 중복 검사 통과');
    
    const hashedPassword = await hashPassword(password);
    const userId = generateUserId();
    
    const userData = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase(),
      phone: cleanPhone,
      affiliation: affiliation.trim(),
      affiliationType: affiliationType,
      password: hashedPassword,
      role: "pending",
      createdAt: new Date().toISOString(),
      approved: false
    };
    
    console.log('💾 [handleRegister] 사용자 데이터 저장 시작:', { userId, email: userData.email, phone: userData.phone });
    
    // 사용자 데이터 저장
    await env.USERS.put(`email:${email}`, userId);
    await env.USERS.put(`phone:${cleanPhone}`, userId);
    await env.USERS.put(`user:${userId}`, JSON.stringify(userData));
    await env.USERS.put(`pending:${userId}`, JSON.stringify(userData));
    
    console.log('✅ [handleRegister] 사용자 데이터 저장 완료');
    
    const response = successResponse(
      { userId, email, affiliation },
      "회원가입이 완료되었습니다. 관리자 승인을 기다려주세요."
    );
    
    console.log('🎉 [handleRegister] 성공 응답 반환:', response);
    return response;
  } catch (error) {
    console.error("❌ [handleRegister] 회원가입 오류:", error);
    return errorResponse("회원가입 중 오류가 발생했습니다.", 500);
  }
}

async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const body = await parseRequestBody(request);
  console.log("[handleLogin] body:", body);
  if (!body) {
    return errorResponse("Invalid request body");
  }
  
  const { identifier, password, identifierType } = body;
  if (!identifier || !password) {
    return errorResponse("로그인 정보를 입력해주세요.");
  }
  
  let userDataStr = null;
  let userId = null;
  let userData = null;
  
  try {
    // 식별자 타입에 따른 사용자 검색
    if (identifierType === "email") {
      userId = await env.USERS.get(`email:${identifier}`);
      console.log("[handleLogin] userId by email:", userId);
      if (userId) {
        userDataStr = await env.USERS.get(`user:${userId}`);
        console.log("[handleLogin] userDataStr by email:", userDataStr);
      }
    } else if (identifierType === "phone") {
      const cleanPhone = identifier.replace(/\s/g, "");
      userId = await env.USERS.get(`phone:${cleanPhone}`);
      console.log("[handleLogin] userId by phone:", userId);
      if (userId) {
        userDataStr = await env.USERS.get(`user:${userId}`);
        console.log("[handleLogin] userDataStr by phone:", userDataStr);
      }
    } else {
      // ambiguous 타입: 이메일과 전화번호 모두 시도
      userId = await env.USERS.get(`email:${identifier}`);
      console.log("[handleLogin] userId by email (ambiguous):", userId);
      if (userId) {
        userDataStr = await env.USERS.get(`user:${userId}`);
        console.log("[handleLogin] userDataStr by email (ambiguous):", userDataStr);
      }
      
      if (!userDataStr) {
        const cleanPhone = identifier.replace(/\s/g, "");
        userId = await env.USERS.get(`phone:${cleanPhone}`);
        console.log("[handleLogin] userId by phone (ambiguous):", userId);
        if (userId) {
          userDataStr = await env.USERS.get(`user:${userId}`);
          console.log("[handleLogin] userDataStr by phone (ambiguous):", userDataStr);
        }
      }
    }
    
    if (!userDataStr) {
      return errorResponse("User not found: 등록되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요.");
    }
    
    // JSON 파싱 시도
    try {
      userData = JSON.parse(userDataStr);
      console.log("[handleLogin] userData parsed:", userData);
    } catch (parseError) {
      console.error("[handleLogin] JSON parse error:", parseError);
      console.error("[handleLogin] userDataStr:", userDataStr);
      return errorResponse("사용자 데이터 오류가 발생했습니다. 관리자에게 문의해주세요.", 500);
    }
    
    // 승인 상태 확인
    console.log("[handleLogin] approved:", userData.approved);
    if (!userData.approved) {
      return errorResponse("Account not approved: 아직 승인되지 않은 계정입니다. 관리자 승인을 기다려주세요.");
    }
    
    // 비밀번호 검증
    const storedPassword = userData.password;
    console.log("[handleLogin] storedPassword exists:", !!storedPassword);
    if (!storedPassword) {
      return errorResponse("Invalid credentials: 이메일/전화번호 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
    }
    
    const isValidPassword = await verifyPassword(password, storedPassword);
    console.log("[handleLogin] isValidPassword:", isValidPassword);
    if (!isValidPassword) {
      return errorResponse("Invalid credentials: 이메일/전화번호 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
    }
    
    // 토큰 생성
    const token = await generateToken(userData.id, userData.role);
    console.log("[handleLogin] token generated:", !!token);
    if (!token) {
      return errorResponse("토큰 생성 중 오류가 발생했습니다.", 500);
    }
    
    return successResponse({
      token,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        affiliation: userData.affiliation,
        affiliationType: userData.affiliationType,
        role: userData.role
      }
    }, "로그인 성공");
    
  } catch (error) {
    console.error("[handleLogin] Login error:", error, {
      body,
      userId,
      userDataStr,
      userData
    });
    return errorResponse("Network error: 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 500);
  }
}

async function handleVerifyToken(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const body = await parseRequestBody(request);
  if (!body || !body.token) {
    return errorResponse("토큰이 필요합니다.");
  }
  
  try {
    const decoded = await verifyToken(body.token);
    if (!decoded) {
      return errorResponse("유효하지 않은 토큰입니다.", 401);
    }
    
    // 사용자 정보 조회
    const userDataStr = await env.USERS.get(`user:${decoded.userId}`);
    if (!userDataStr) {
      return errorResponse("사용자를 찾을 수 없습니다.", 404);
    }
    
    let userData;
    try {
      userData = JSON.parse(userDataStr);
    } catch (parseError) {
      console.log("JSON parse failed for token verification, trying manual parse...");
      const cleanDataStr = userDataStr.replace(/^'|'$/g, "");
      const matches = cleanDataStr.match(/(\w+):([^,}]+)/g);
      userData = {};
      matches.forEach((match) => {
        const [key, value] = match.split(":");
        userData[key.trim()] = value.trim().replace(/^"|"$/g, "");
      });
    }
    
    return successResponse({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        affiliation: userData.affiliation,
        affiliationType: userData.affiliationType,
        role: userData.role,
        approved: userData.approved
      }
    }, "토큰 검증 성공");
  } catch (error) {
    console.error("Token verification error:", error);
    return errorResponse("토큰 검증 중 오류가 발생했습니다.", 500);
  }
}

// Export all functions
export {
  handleRegister,
  handleLogin,
  handleVerifyToken,
  handleCheckEmail,
  handleCheckPhone
};

// CORS 처리
export function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
} 