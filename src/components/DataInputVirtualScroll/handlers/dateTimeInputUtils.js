export function setupDateTimeInputHandling(cellElement, initialKey = '', clickX = null) {
  // Clean up 기존 리스너가 있으면 제거
  if (cellElement.__dtKeyHandler) {
    cellElement.removeEventListener('keydown', cellElement.__dtKeyHandler);
  }

  let digits = '';
  const DIGIT_RE = /\d/;

  // 스타일 1회 주입
  if (!document.getElementById('sep-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'sep-style';
    styleEl.textContent = '.sep.dim{color:#bbb;}.sep.on{color:#000;}';
    document.head.appendChild(styleEl);
  }

  const buildHTML = () => {
    const parts = [];
    const pushDigit = (idx) => {
      parts.push(idx < digits.length ? digits[idx] : '&nbsp;');
    };
    for (let i = 0; i < 4; i++) pushDigit(i);
    parts.push(`<span class="sep ${digits.length >= 4 ? 'on' : 'dim'}">-</span>`);
    for (let i = 4; i < 6; i++) pushDigit(i);
    parts.push(`<span class="sep ${digits.length >= 6 ? 'on' : 'dim'}">-</span>`);
    for (let i = 6; i < 8; i++) pushDigit(i);
    parts.push(`<span class="sep ${digits.length >= 8 ? 'on' : 'dim'}">&nbsp;</span>`);
    for (let i = 8; i < 10; i++) pushDigit(i);
    parts.push(`<span class="sep ${digits.length >= 10 ? 'on' : 'dim'}">:</span>`);
    for (let i = 10; i < 12; i++) pushDigit(i);
    return parts.join('');
  };

  const setCaretByCharIndex = (index) => {
    let remain = index;
    for (const node of cellElement.childNodes) {
      const len = node.textContent.length;
      if (remain <= len) {
        const range = document.createRange();
        const sel = window.getSelection();
        if (node.nodeType === Node.TEXT_NODE) {
          range.setStart(node, remain);
        } else {
          range.setStartBefore(node);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remain -= len;
    }
  };

  const render = (useClick = false) => {
    cellElement.innerHTML = buildHTML();
    if (useClick && clickX !== null) {
      for (const node of cellElement.childNodes) {
        const rect = node.getBoundingClientRect();
        if (clickX <= rect.left + rect.width / 2) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStartBefore(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
      setCaretByCharIndex(digits.length);
    } else {
      setCaretByCharIndex(digits.length);
    }
    cellElement.dispatchEvent(new Event('input', { bubbles: true }));
  };

  render(true);
  if (DIGIT_RE.test(initialKey)) {
    digits += initialKey;
    render();
  }

  const handler = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      digits = digits.slice(0, -1);
      render();
    } else if (DIGIT_RE.test(e.key)) {
      e.preventDefault();
      if (digits.length < 12) {
        digits += e.key;
        render();
      }
    }
  };
  cellElement.__dtKeyHandler = handler;
  cellElement.addEventListener('keydown', handler);

  // attach handler on window as fallback
  const globalHandler = (e) => {
    handler(e);
  };
  window.addEventListener('keydown', globalHandler, true);

  // cleanup update
  const cleanup = () => {
    cellElement.removeEventListener('keydown', handler);
    window.removeEventListener('keydown', globalHandler, true);
    cellElement.removeEventListener('blur', cleanup);
    delete cellElement.__dtKeyHandler;
  };
  cellElement.addEventListener('blur', cleanup);
  if (!cellElement.getAttribute('contenteditable')) cellElement.setAttribute('contenteditable', 'true');
  cellElement.focus();
} 