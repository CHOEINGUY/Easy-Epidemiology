# AI 에이전트를 위한 툴팁 개발 표준

이 문서는 프로젝트 내 툴팁 메시지의 일관성을 유지하고 사용자 경험을 향상시키기 위한 개발 표준을 정의합니다. AI 에이전트는 새로운 기능을 추가하거나 기존 기능을 수정할 때 반드시 이 표준을 준수해야 합니다.

## 1. 기본 원칙

**툴팁 메시지는 반드시 하나의 완전한 문장으로 작성한다.**

사용자에게 간결하고 명확한 정보를 전달하기 위함입니다. 두 개 이상의 문장으로 분리하거나, 불완전한 구문으로 작성하는 것을 지양합니다.

## 2. 권장 형식

**"[무엇]을/를 [어떻게]합니다" 형식을 사용한다.**

-   **[무엇]**: 동작의 대상을 명시합니다. (예: 차트 너비, 폰트 크기, 막대 색상)
-   **[어떻게]**: 동작의 방식을 설명합니다. (예: 조절합니다, 변경합니다, 선택합니다)

이 형식은 사용자에게 컨트롤의 기능을 명확하게 안내하여 직관적인 UI를 제공합니다.

## 3. 스타일 가이드

-   문장 끝에 마침표(`.`)를 포함하지 않습니다.
-   메시지는 존댓말을 사용하며, `~합니다` 체로 통일합니다.

## 4. 예시

### 좋은 예 (Good Examples)

-   `차트 너비를 조절합니다`
-   `폰트 크기를 조절합니다`
-   `막대 색상을 변경합니다`
-   `증상 발현 시간 간격을 변경합니다`
-   `기준 의심 노출 시간을 설정합니다`

### 나쁜 예 (Bad Examples)

-   `차트 너비를 순차적으로 조절합니다` (불필요한 "순차적으로" 포함)
-   `클릭하여 차트 너비를 조절합니다` (불필요한 "클릭하여" 포함)
-   `차트 너비를 조절합니다. 클릭해서 바꾸세요.` (두 문장, 명령조)
-   `차트 너비 변경` (불완전한 문장)
-   `차트의 너비를 바꾸려면 클릭하세요.` (다른 형식)
-   `차트 너비를 조절함.` (다른 어조)

## 5. 개발 방법 (Implementation)

프로젝트 내 모든 툴팁은 아래의 표준 개발 방법을 따라 구현합니다.

### 5.1. Vue 템플릿 구조

툴팁을 적용할 요소(버튼, 입력 필드 등)는 반드시 `control-button-wrapper` 클래스를 가진 `div`로 감싸야 합니다. 툴팁 자체는 `v-if` 디렉티브를 사용하여 조건부로 렌더링됩니다.

```html
<div class="control-button-wrapper">
  <!-- 툴팁을 적용할 대상 요소 -->
  <button @mouseenter="showTooltip('myButton', '버튼 기능을 설명합니다')" @mouseleave="hideTooltip">
    버튼
  </button>

  <!-- 툴팁 컴포넌트 -->
  <div v-if="activeTooltip === 'myButton'" class="control-tooltip">
    {{ tooltipText }}
  </div>
</div>
```

-   **`@mouseenter`**: `showTooltip` 함수를 호출합니다. 첫 번째 인자로는 고유한 `key`를, 두 번째 인자로는 툴팁 메시지를 전달합니다.
-   **`@mouseleave`**: `hideTooltip` 함수를 호출합니다.
-   **`v-if="activeTooltip === 'myButton'"`**: `activeTooltip` 상태가 해당 요소의 `key`와 일치할 때만 툴팁을 표시합니다.

### 5.2. 고급 구현: Teleport를 활용한 Body 렌더링

복잡한 레이아웃에서 부모 컨테이너의 `overflow: hidden` 설정으로 인해 툴팁이 잘리는 문제가 발생할 수 있습니다. 이런 경우 Vue 3의 **Teleport**를 사용하여 툴팁을 `body`에 직접 렌더링하는 것을 권장합니다.

```html
<template>
  <!-- 버튼들 -->
  <div class="control-button-wrapper">
    <button 
      ref="buttonRef"
      @mouseenter="showTooltip('myButton', '툴팁 메시지', $event)"
      @mouseleave="hideTooltip"
    >
      버튼
    </button>
  </div>

  <!-- Teleport를 사용해서 툴팁을 body에 렌더링 -->
  <Teleport to="body">
    <div 
      v-if="activeTooltip === 'myButton'" 
      class="teleport-tooltip"
      :style="tooltipStyle"
    >
      {{ tooltipText }}
    </div>
  </Teleport>
</template>
```

### 5.3. Vue 스크립트 로직

모든 컴포넌트에서 툴팁을 제어하기 위해 아래와 같은 `ref`와 함수들이 필요합니다.

#### 기본 구현

```javascript
import { ref } from 'vue';

// 현재 활성화된 툴팁의 키를 저장
const activeTooltip = ref(null);
// 표시될 툴팁의 텍스트를 저장
const tooltipText = ref('');

/**
 * 툴팁을 표시하는 함수
 * @param {string} key - 툴팁을 식별하는 고유한 키
 * @param {string} text - 툴팁에 표시될 메시지
 */
const showTooltip = (key, text) => {
    activeTooltip.value = key;
    tooltipText.value = text;
};

/**
 * 툴팁을 숨기는 함수
 */
const hideTooltip = () => {
    activeTooltip.value = null;
};
```

#### 고급 구현 (Teleport + 동적 위치 계산)

```javascript
import { ref, computed, nextTick } from 'vue';

// 툴팁 상태 관리
const activeTooltip = ref(null);
const tooltipText = ref('');
const tooltipPosition = ref({ x: 0, y: 0 });

// 버튼 참조들
const buttonRef = ref(null);

/**
 * 툴팁 스타일 계산
 */
const tooltipStyle = computed(() => {
  return {
    position: 'fixed',
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
    transform: 'translateX(-50%)',
    zIndex: 10002
  };
});

/**
 * 버튼 위치 계산
 */
const getButtonPosition = (buttonElement) => {
  if (buttonElement) {
    const rect = buttonElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 5,
      buttonRect: rect
    };
  }
  return { x: 0, y: 0, buttonRect: null };
};

/**
 * 화면 경계를 고려한 툴팁 위치 조정
 */
const adjustTooltipPosition = (initialPosition) => {
  const tooltip = document.querySelector('.teleport-tooltip');
  if (!tooltip || !initialPosition.buttonRect) {
    return { x: initialPosition.x, y: initialPosition.y };
  }

  const tooltipRect = tooltip.getBoundingClientRect();
  const screenWidth = window.innerWidth;
  const padding = 10;
  
  let x = initialPosition.x;
  const y = initialPosition.y;
  
  // 오른쪽 경계 확인
  if (x + tooltipRect.width / 2 > screenWidth - padding) {
    x = screenWidth - tooltipRect.width / 2 - padding;
  }
  
  // 왼쪽 경계 확인
  if (x - tooltipRect.width / 2 < padding) {
    x = tooltipRect.width / 2 + padding;
  }
  
  return { x, y };
};

/**
 * 고급 툴팁 표시 함수
 * @param {string} key - 툴팁을 식별하는 고유한 키
 * @param {string} text - 툴팁에 표시될 메시지
 * @param {Event} event - 마우스 이벤트
 */
const showTooltip = async (key, text, event) => {
  activeTooltip.value = key;
  tooltipText.value = text;
  
  // 버튼 요소 찾기
  const buttonElement = event.target.closest('button') || buttonRef.value;
  
  // 초기 위치 설정
  const initialPosition = getButtonPosition(buttonElement);
  tooltipPosition.value = { x: initialPosition.x, y: initialPosition.y };
  
  // DOM 업데이트 후 실제 너비로 위치 재조정
  await nextTick();
  const adjustedPosition = adjustTooltipPosition(initialPosition);
  tooltipPosition.value = adjustedPosition;
};

/**
 * 툴팁을 숨기는 함수
 */
const hideTooltip = () => {
  activeTooltip.value = null;
};
```

이 로직을 각 컴포넌트의 `<script setup>` 내에 포함하여 사용합니다. 이를 통해 일관된 툴팁 동작을 보장할 수 있습니다.

### 5.4. Vue 스타일 (CSS)

일관된 툴팁 디자인을 위해 아래의 CSS 클래스를 사용합니다.

#### 기본 툴팁 스타일

```css
.control-button-wrapper {
  position: relative;
  display: inline-block;
}

.control-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1050;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
}

.control-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

#### Teleport 툴팁 스타일

```css
/* Body에 렌더링되는 툴팁 스타일 */
.teleport-tooltip {
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: tooltipFadeIn 0.2s ease-in-out;
  font-family: "Google Sans", Roboto, Arial, sans-serif;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

### 5.5. 중요 주의사항

#### 네이티브 툴팁과의 중복 방지
버튼이나 요소에 `title` 속성이 있으면 브라우저의 네이티브 툴팁과 커스텀 툴팁이 동시에 나타날 수 있습니다. 이를 방지하기 위해:

```html
<!-- ❌ 잘못된 예시 - 중복 툴팁 발생 -->
<button title="네이티브 툴팁" @mouseenter="showTooltip(...)">
  버튼
</button>

<!-- ✅ 올바른 예시 - title 속성 제거 -->
<button @mouseenter="showTooltip(...)">
  버튼
</button>
```

#### 성능 최적화
- `nextTick`을 사용한 동적 위치 계산은 성능에 미치는 영향이 미미하지만, 매우 자주 호출되는 경우 디바운싱을 고려하세요.
- 화면 크기가 변경될 때 툴팁 위치를 재계산하려면 `resize` 이벤트 리스너를 추가할 수 있습니다.

#### 접근성 고려사항
- `aria-describedby` 속성을 사용하여 툴팁과 요소를 연결하세요.
- 키보드 사용자를 위해 `focus`/`blur` 이벤트도 처리하세요.

```html
<button 
  :aria-describedby="activeTooltip === 'myButton' ? 'tooltip-myButton' : null"
  @mouseenter="showTooltip('myButton', '툴팁 메시지', $event)"
  @mouseleave="hideTooltip"
  @focus="showTooltip('myButton', '툴팁 메시지', $event)"
  @blur="hideTooltip"
>
  버튼
</button>

<Teleport to="body">
  <div 
    v-if="activeTooltip === 'myButton'" 
    id="tooltip-myButton"
    role="tooltip"
    class="teleport-tooltip"
    :style="tooltipStyle"
  >
    {{ tooltipText }}
  </div>
</Teleport>
```