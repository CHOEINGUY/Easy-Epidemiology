#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Material Icons 폰트 파일 URLs (최신 버전 - 2025년 1월 업데이트)
const fontUrls = {
  'MaterialIcons-Regular.ttf': 'https://fonts.gstatic.com/s/materialicons/v143/flUhRq6tzZclQEJ-Vdg-IuiaDsNZ.ttf',
  'MaterialIconsOutlined-Regular.otf': 'https://fonts.gstatic.com/s/materialiconsoutlined/v110/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUcd.otf'
};

// 폰트 디렉토리 생성
const fontsDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log('📁 폰트 디렉토리 생성됨:', fontsDir);
}

// 파일 다운로드 함수
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(fontsDir, filename);
    
    // 파일이 이미 존재하는지 확인
    if (fs.existsSync(filepath)) {
      console.log(`✅ ${filename} 이미 존재함`);
      resolve();
      return;
    }

    console.log(`⬇️  ${filename} 다운로드 중...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ ${filename} 다운로드 완료`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // 파일 삭제
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 모든 폰트 파일 다운로드
async function downloadAllFonts() {
  console.log('🚀 Material Icons 폰트 파일 다운로드 시작...\n');
  
  try {
    const promises = Object.entries(fontUrls).map(([filename, url]) => 
      downloadFile(url, filename)
    );
    
    await Promise.all(promises);
    
    console.log('\n🎉 모든 폰트 파일 다운로드 완료!');
    console.log('📁 위치:', fontsDir);
    console.log('\n💡 이제 로컬 Material Icons를 사용할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 폰트 다운로드 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  downloadAllFonts();
}

module.exports = { downloadAllFonts }; 