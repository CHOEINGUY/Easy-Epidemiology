<!-- 
  AuthRegister.vue - Wrapper for backward compatibility
  실제 구현은 AuthRegister/ 폴더로 이동되었습니다.
-->
<script setup>
import AuthRegister from './AuthRegister/index.vue';
// Re-export is not needed in script setup if we just use the component in template, 
// but since this is a wrapper likely used by router or parent, we need to ensure it behaves correctly.
// Actually, for a simple wrapper that just re-exports, a .js file would be better, but keeping .vue for now.
// However, <script setup> doesn't support 'export default' directly.
// If this file is just re-exporting, maybe we can just use defineOptions or proper template usage?
// Wait, the original was `export default AuthRegister`. This pattern essentially makes this .vue file act as the imported component.
// In Vue 3 <script setup>, we can't easily do "export default ImportedComponent".
// Best approach: Use the imported component in the template.
</script>

<template>
  <AuthRegister />
</template>
