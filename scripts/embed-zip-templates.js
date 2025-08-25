const fs = require('fs');
const path = require('path');

/**
 * ZIP 파일을 Base64로 변환하여 JS 파일로 생성
 */
function embedZipTemplates() {
  console.log('🔧 ZIP 템플릿 파일을 Base64로 임베드 중...');
  
  const templates = [
    {
      name: 'report_template.zip',
      output: 'reportTemplateBase64.js'
    },
    {
      name: 'report_template_caseControl.zip', 
      output: 'reportTemplateCaseControlBase64.js'
    },
    {
      name: 'report_template_cohort.zip',
      output: 'reportTemplateCohortBase64.js'
    }
  ];
  
  templates.forEach(template => {
    try {
      // ZIP 파일 읽기
      const zipPath = path.join(__dirname, '..', 'public', template.name);
      const zipBuffer = fs.readFileSync(zipPath);
      
      // Base64로 변환
      const base64String = zipBuffer.toString('base64');
      
      // JS 파일 생성
      const jsContent = `// ${template.name}을 Base64로 임베드한 파일
// 자동 생성됨 - 수정하지 마세요

export function get${template.output.replace('.js', '')}ArrayBuffer() {
  const base64String = '${base64String}';
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

export function get${template.output.replace('.js', '')}Base64() {
  return '${base64String}';
}
`;
      
      // 파일 저장
      const outputPath = path.join(__dirname, '..', 'src', 'utils', template.output);
      fs.writeFileSync(outputPath, jsContent);
      
      console.log(`✅ ${template.name} → ${template.output} 변환 완료`);
      console.log(`   크기: ${(zipBuffer.length / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error(`❌ ${template.name} 변환 실패:`, error.message);
    }
  });
  
  console.log('🎉 모든 ZIP 파일 임베드 완료!');
}

// 스크립트 실행
if (require.main === module) {
  embedZipTemplates();
}

module.exports = { embedZipTemplates }; 