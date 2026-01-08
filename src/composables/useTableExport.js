import { ref } from 'vue';

export function useTableExport() {
  const isCopied = ref(false);

  const copyToClipboard = async ({ text, html }) => {
    try {
      if (html && navigator.clipboard && window.ClipboardItem) {
        // HTML + Text 복사
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
      } else {
        // 텍스트만 복사 (HTML 미지원 환경 또는 HTML 미제공 시)
        await navigator.clipboard.writeText(text);
      }

      isCopied.value = true;
      setTimeout(() => (isCopied.value = false), 1500);
      return true;
    } catch (e) {
      console.error('Clipboard copy failed', e);
      isCopied.value = false;
      return false;
    }
  };

  return {
    isCopied,
    copyToClipboard
  };
}
