<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Easy-Epidemiology Web v1.4</h1>
    </header>

    <div class="dashboard">
      <div class="summary-bar">
         <div class="summary-bar__title">
          <span class="material-icons summary-bar__logo">show_chart</span>
          유행곡선 및 잠복기 분석
        </div>
      </div>

      <div class="output-area">
        <div class="output-row">
          <div class="table-container analysis-table-container">            <!-- 의심식단 입력 필드 추가 -->
            <div class="suspected-food-input-container">
              <div class="suspected-food-input-wrapper">
                <div class="suspected-food-title">
                  <span class="selected-variable-details__title-dot"></span>
                  <span style="margin-left: 0.2em;">추정 감염원 선택</span>
                  <div class="analysis-status-wrapper">
                    <span 
                      v-if="analysisStatus" 
                      ref="analysisTooltipRef"
                      class="analysis-status-badge" 
                      :class="analysisStatus.type"
                      @mouseenter="showAnalysisTooltip = true"
                      @mouseleave="showAnalysisTooltip = false"
                    >
                      {{ analysisStatus.message }}
                    </span>
                    <div 
                      v-if="showAnalysisTooltip" 
                      class="analysis-tooltip"
                      :style="analysisTooltipStyle"
                    >
                      {{ getAnalysisStatusTooltip(analysisStatus) }}
                    </div>
                  </div>
                </div>
                <div class="suspected-food-dropdown-container">
                  <div class="suspected-food-dropdown-wrapper">
                    <!-- 통합된 드롭다운과 입력란 -->
                    <div class="unified-food-selector">
                      <!-- 입력란 (드롭다운 트리거 역할도 함) -->
                      <div class="input-dropdown-trigger" @click="toggleDropdown">
                        <input
                          v-model="suspectedFood"
                          type="text"
                          class="unified-food-input"
                          placeholder="추정 감염원을 선택하거나 직접 입력하세요"
                          @input="onSuspectedFoodChange"
                          :disabled="!hasAnalysisResults"
                        />
                        <span class="dropdown-arrow">▼</span>
                      </div>
                      
                      <!-- 체크박스 드롭다운 메뉴 -->
                      <div v-if="isDropdownOpen" class="checkbox-dropdown-menu">
                        <div class="dropdown-header">
                          <span>추정 감염원 선택 (다중 선택 가능)</span>
                        </div>
                        <div 
                          v-for="food in (backgroundAnalysisFoods.length > 0 ? backgroundAnalysisFoods : sortedFoodItems)" 
                          :key="food.item"
                          class="checkbox-dropdown-item"
                          @click="toggleFoodSelection(food.item)"
                        >
                          <input
                            type="checkbox"
                            :checked="isFoodSelected(food.item)"
                            @click.stop
                            @change="toggleFoodSelection(food.item)"
                            class="food-checkbox"
                          />
                          <span class="food-name">{{ food.item }}</span>
                          <span v-if="food.pValue !== null" class="food-stat">
                            p={{ food.pValue < 0.001 ? '<0.001' : food.pValue.toFixed(3) }}
                            <span v-if="food.oddsRatio && food.oddsRatio !== 'N/A'" class="food-or">
                              (OR: {{ food.oddsRatio }})
                            </span>
                            <span v-else-if="food.relativeRisk && food.relativeRisk !== 'N/A'" class="food-or">
                              (RR: {{ food.relativeRisk }})
                            </span>
                          </span>
                          <span v-else-if="food.oddsRatio && food.oddsRatio !== 'N/A'" class="food-stat">
                            OR: {{ food.oddsRatio }}
                          </span>
                          <span v-else-if="food.relativeRisk && food.relativeRisk !== 'N/A'" class="food-stat">
                            RR: {{ food.relativeRisk }}
                          </span>
                        </div>
                        <div class="dropdown-footer">
                          <button @click="applySelectedFoods" class="apply-button">닫기</button>
                          <button @click="closeDropdown" class="cancel-button">취소</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">증상 발현 시간별 환자 수</span>
              </span>
              <div style="position: relative;">
                <button @click="copySymptomTableToClipboard" class="copy-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                  <span class="button-text">복사</span>
                </button>
                <div v-if="isSymptomTableCopied" class="copy-tooltip check-tooltip">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                    <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <table
              v-if="symptomOnsetTableData.length > 0"
              class="frequency-table"
            >
              <thead>
                <tr>
                  <th class="frequency-table__header">증상 발현 시간</th>
                  <th class="frequency-table__header">수</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in symptomOnsetTableData"
                  :key="'onset-' + index"
                  class="frequency-table__row"
                >
                  <td class="frequency-table__cell">
                    {{ item.intervalLabel }}
                  </td>
                  <td class="frequency-table__cell">{{ item.count }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data-message">
              <DataGuideMessage
                icon="schedule"
                title="증상 발현 시간 데이터가 필요합니다"
                description="유행곡선을 생성하려면 환자들의 증상 발현 시간 정보가 필요합니다."
                :steps="[
                  { number: '1', text: '데이터 입력 화면에서 \'증상발현시간\' 열에 시간을 입력하세요' },
                  { number: '2', text: '최소 2명 이상의 환자 데이터가 필요합니다' },
                  { number: '3', text: '시간 형식: YYYY-MM-DD HH:MM (예: 2024-01-15 14:30)' }
                ]"
              />
            </div>

            <div class="table-title symptom-summary-title">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">발생 요약 정보</span>
              </span>
            </div>

            <div class="summary-info-embedded">
              <div class="info-item">
                <span class="info-label">최초 발생일시 :</span>
                <span class="info-value">{{ formattedFirstOnsetTime }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">최종 발생일시 :</span>
                <span class="info-value">{{ formattedLastOnsetTime }}</span>
              </div>
            </div>
          </div>

          <div class="controls-and-chart-wrapper">
            <div class="controls-area symptom-controls-local">
              <div class="control-group">
                <label for="symptom-interval" class="control-label"
                  >증상발현 시간간격 :</label
                >
                <div class="control-button-wrapper">
                  <select
                    id="symptom-interval"
                    v-model.number="selectedSymptomInterval"
                    class="control-select"
                    @mouseenter="showTooltip('symptomInterval', '증상 발현 시간 간격을 변경합니다')" @mouseleave="hideTooltip"
                  >
                    <option value="3">3시간</option>
                    <option value="6">6시간</option>
                    <option value="12">12시간</option>
                    <option value="24">24시간</option>
                    <option value="48">48시간</option>
                  </select>
                  <div v-if="activeTooltip === 'symptomInterval'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">폰트 크기:</label>
                <div class="control-button-wrapper">
                  <button class="control-button font-button" @click="cycleEpiFontSize" @mouseenter="handleEpiFontSizeMouseEnter" @mouseleave="handleEpiFontSizeMouseLeave">
                    {{ epiFontSizeButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'epiFontSize'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleEpiChartWidth" @mouseenter="handleEpiChartWidthMouseEnter" @mouseleave="handleEpiChartWidthMouseLeave">
                    {{ epiChartWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'epiChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">색상:</label>
                <div class="control-button-wrapper">
                  <button class="control-button color-button" :style="{ backgroundColor: epiBarColor }" @click="cycleEpiBarColor" @mouseenter="showTooltip('epiColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
                  <div v-if="activeTooltip === 'epiColor'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 표시:</label>
                <div class="control-button-wrapper">
                  <button @click="selectDisplayMode('time')" 
                          :class="{ 'chart-select-button--active': chartDisplayMode === 'time' }" 
                          class="chart-select-button"
                          @mouseenter="showTooltip('displayModeTime', '간단한 시 단위 표시')" 
                          @mouseleave="hideTooltip">
                    시 단위
                  </button>
                  <div v-if="activeTooltip === 'displayModeTime'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
                <div class="control-button-wrapper">
                  <button @click="selectDisplayMode('datetime')" 
                          :class="{ 'chart-select-button--active': chartDisplayMode === 'datetime' }" 
                          class="chart-select-button"
                          @mouseenter="showTooltip('displayModeDateTime', '정확한 날짜와 시간 표시')" 
                          @mouseleave="hideTooltip">
                    날짜+시간
                  </button>
                  <div v-if="activeTooltip === 'displayModeDateTime'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <!-- 확진자 꺾은선 표시 토글 추가 -->
              <div v-if="isConfirmedCaseColumnVisible" class="control-group">
                <label class="control-label">확진자 꺾은선:</label>
                <div class="control-button-wrapper">
                  <button @click="showConfirmedCaseLine = !showConfirmedCaseLine" 
                          :class="{ 'chart-select-button--active': showConfirmedCaseLine }" 
                          class="chart-select-button"
                          @mouseenter="showTooltip('confirmedCaseLine', '확진자 꺾은선 표시/숨김')" 
                          @mouseleave="hideTooltip">
                    {{ showConfirmedCaseLine ? '표시' : '숨김' }}
                  </button>
                  <div v-if="activeTooltip === 'confirmedCaseLine'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <!-- 차트 설정 초기화 버튼 -->
              <div class="control-group reset-button-group">
                <button @click="resetEpiChartSettings" 
                        class="control-button reset-text-button"
                        @mouseenter="showTooltip('resetEpiChart', '유행곡선 차트 설정을 기본값으로 초기화합니다')" 
                        @mouseleave="hideTooltip">
                  초기화
                </button>
                <div v-if="activeTooltip === 'resetEpiChart'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="chart-container-wrapper epi-chart-wrapper">
              <div class="chart-buttons">
                <div style="position: relative;">
                  <button
                    @click="saveChartForReport"
                    :class="['export-chart-button', isChartSaved ? 'saved' : 'unsaved', 'shadow-blink']"
                    @mouseenter="onEpiSaveMouseEnter"
                    @mouseleave="onEpiSaveMouseLeave"
                    @focus="onEpiSaveInteract"
                    @pointerdown="onEpiSaveInteract"
                  >
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                    </span>
                    <span class="button-text">{{ isChartSaved ? '저장 완료' : '보고서 저장' }}</span>
                  </button>
                  <div v-if="activeTooltip === 'saveEpiReport'" class="control-tooltip">
                    {{ tooltipText }}
                  </div>
                  <div v-if="showChartSavedTooltip" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div style="position: relative;">
                  <button @click="copyChartToClipboard" class="copy-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </span>
                    <span class="button-text">차트 복사</span>
                  </button>
                  <div v-if="isEpiChartCopied" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div style="position: relative;">
                  <button @click="exportChart" class="export-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </span>
                    <span class="button-text">차트 저장</span>
                  </button>
                </div>
              </div>
              <div ref="epiCurveChartContainer" class="chart-instance" :style="{ width: epiChartWidth + 'px' }"></div>
            </div>
          </div>
        </div>

        <div class="output-row">
          <div class="table-container">
            <div class="table-title" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">예상 잠복 기간별 환자 수</span>
              </span>
              <div style="position: relative;">
                <button @click="copyIncubationTableToClipboard" class="copy-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                  <span class="button-text">복사</span>
                </button>
                <div v-if="isIncubationTableCopied" class="copy-tooltip check-tooltip">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                    <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <table
              v-if="incubationPeriodTableData.length > 0"
              class="frequency-table"
            >
              <thead>
                <tr>
                  <th class="frequency-table__header">예상 잠복 기간</th>
                  <th class="frequency-table__header">수</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in incubationPeriodTableData"
                  :key="'incubation-' + index"
                  class="frequency-table__row"
                >
                  <td class="frequency-table__cell">
                    {{ item.intervalLabel }}
                  </td>
                  <td class="frequency-table__cell">{{ item.count }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-data-message">
              <DataGuideMessage
                v-if="!exposureDateTime && !isIndividualExposureColumnVisible"
                icon="event"
                title="의심원 노출시간을 설정해주세요"
                description="잠복기 분석을 위해 기준이 되는 의심원 노출시간을 설정해야 합니다."
                :steps="[
                  { number: '1', text: '위의 \'의심원 노출시간\' 입력란을 클릭하세요' },
                  { number: '2', text: '모든 환자에게 공통으로 적용될 기준 노출시간을 설정하세요' },
                  { number: '3', text: '설정 후 잠복기 분석이 자동으로 시작됩니다' }
                ]"
              />
              <template v-else-if="exposureDateTime && incubationDurations.length === 0 && !isIndividualExposureColumnVisible"></template>
              <DataGuideMessage
                v-else
                icon="schedule"
                title="증상 발현 시간 데이터가 필요합니다"
                description="유행곡선을 생성하려면 환자들의 증상 발현 시간 정보가 필요합니다."
                :steps="[
                  { number: '1', text: '데이터 입력 화면에서 \'증상발현시간\' 열에 시간을 입력하세요' },
                  { number: '2', text: '최소 2명 이상의 환자 데이터가 필요합니다' },
                  { number: '3', text: '시간 형식: YYYY-MM-DD HH:MM (예: 2024-01-15 14:30)' }
                ]"
              />
            </div>

            <div class="table-title incubation-summary-title">
              <span style="display: flex; align-items: center;">
                <span class="selected-variable-details__title-dot"></span>
                <span style="margin-left: 0.2em;">잠복기 요약 정보</span>
              </span>
            </div>

            <div class="incubation-summary-info-embedded">
              <div class="info-item">
                  <span class="info-label">최소 잠복기 :</span>
                  <span class="info-value">{{ minIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">최대 잠복기 :</span>
                  <span class="info-value">{{ maxIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">평균 잠복기 :</span>
                  <span class="info-value">{{ avgIncubationPeriodFormatted }}</span>
              </div>
              <div class="info-item">
                  <span class="info-label">중앙 잠복기 :</span>
                  <span class="info-value">{{ medianIncubationPeriodFormatted }}</span>
              </div>
            </div>
          </div>

          <div class="controls-and-chart-wrapper">
            <div class="controls-area incubation-controls-local">
              <div v-if="!isIndividualExposureColumnVisible" class="control-group">
                <label for="exposure-time" class="control-label">의심원 노출시간 :</label>
                <div class="control-button-wrapper">
                  <input
                    type="text"
                    id="exposure-time"
                    :value="formattedExposureDateTime"
                    @click="showExposureDateTimePicker"
                    readonly
                    class="control-input-datetime"
                    @mouseenter="showTooltip('exposureTime', '기준 의심원 노출일을 설정합니다.', $event)"
                    @mouseleave="hideTooltip"
                    title="모든 환자에게 동일하게 적용될 기준 의심원 노출시간을 설정합니다."
                    placeholder="YYYY-MM-DD HH:MM"
                  />
                  <div v-if="activeTooltip === 'exposureTime'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label for="incubation-interval" class="control-label">계급 간격(시간) :</label>
                <div class="control-button-wrapper">
                  <select
                    id="incubation-interval"
                    v-model.number="selectedIncubationInterval"
                    class="control-select"
                    @mouseenter="showTooltip('incubationInterval', '잠복기 계산 간격을 변경합니다')" @mouseleave="hideTooltip"
                  >
                    <option value="3">3시간</option>
                    <option value="6">6시간</option>
                    <option value="12">12시간</option>
                    <option value="24">24시간</option>
                    <option value="48">48시간</option>
                  </select>
                  <div v-if="activeTooltip === 'incubationInterval'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">폰트 크기:</label>
                <div class="control-button-wrapper">
                  <button class="control-button font-button" @click="cycleIncubationFontSize" @mouseenter="handleIncubationFontSizeMouseEnter" @mouseleave="handleIncubationFontSizeMouseLeave">
                    {{ incubationFontSizeButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'incubationFontSize'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 너비:</label>
                <div class="control-button-wrapper">
                  <button class="control-button width-button" @click="cycleIncubationChartWidth" @mouseenter="handleIncubationChartWidthMouseEnter" @mouseleave="handleIncubationChartWidthMouseLeave">
                    {{ incubationChartWidthButtonText }}
                  </button>
                  <div v-if="activeTooltip === 'incubationChartWidth'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">색상:</label>
                <div class="control-button-wrapper">
                  <button class="control-button color-button" :style="{ backgroundColor: incubationBarColor }" @click="cycleIncubationBarColor" @mouseenter="showTooltip('incubationColor', '막대 색상을 변경합니다')" @mouseleave="hideTooltip"></button>
                  <div v-if="activeTooltip === 'incubationColor'" class="control-tooltip">{{ tooltipText }}</div>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">차트 표시:</label>
                <div class="control-button-wrapper">
                  <button @click="selectIncubationDisplayMode('hour')" :class="{ 'chart-select-button--active': incubationChartDisplayMode === 'hour' }" class="chart-select-button">시간 단위</button>
                </div>
                <div class="control-button-wrapper">
                  <button @click="selectIncubationDisplayMode('hhmm')" :class="{ 'chart-select-button--active': incubationChartDisplayMode === 'hhmm' }" class="chart-select-button">시:분 단위</button>
                </div>
              </div>
              <!-- 차트 설정 초기화 버튼 -->
              <div class="control-group reset-button-group">
                <button @click="resetIncubationChartSettings" 
                        class="control-button reset-text-button"
                        @mouseenter="showTooltip('resetIncubationChart', '잠복기 차트 설정을 기본값으로 초기화합니다')" 
                        @mouseleave="hideTooltip">
                  초기화
                </button>
                <div v-if="activeTooltip === 'resetIncubationChart'" class="control-tooltip">{{ tooltipText }}</div>
              </div>
            </div>
            <div class="chart-container-wrapper incubation-chart-wrapper">
              <div class="chart-buttons">
                <div style="position: relative;">
                  <button
                    @click="saveIncubationChartForReport"
                    :class="['export-chart-button', isIncubationChartSaved ? 'saved' : 'unsaved', 'shadow-blink']"
                    @mouseenter="onIncubationSaveMouseEnter"
                    @mouseleave="onIncubationSaveMouseLeave"
                    @focus="onIncubationSaveInteract"
                    @pointerdown="onIncubationSaveInteract"
                  >
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                    </span>
                    <span class="button-text">{{ isIncubationChartSaved ? '저장 완료' : '보고서 저장' }}</span>
                  </button>
                  <div v-if="activeTooltip === 'saveIncubationReport'" class="control-tooltip">
                    {{ tooltipText }}
                  </div>
                  <div v-if="showIncubationChartSavedTooltip" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div style="position: relative;">
                  <button @click="copyIncubationChartToClipboard" class="copy-chart-button">
                    <span class="button-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </span>
                    <span class="button-text">차트 복사</span>
                  </button>
                  <div v-if="isIncubationChartCopied" class="copy-tooltip check-tooltip">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#1a73e8"/>
                      <polyline points="7,13 11,17 17,9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <button @click="exportIncubationChart" class="export-chart-button">
                  <span class="button-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </span>
                  <span class="button-text">차트 저장</span>
                </button>
              </div>
              <div
                v-if="exposureDateTime && incubationDurations.length === 0 && !isIndividualExposureColumnVisible"
                class="no-data-message"
              >
                <DataGuideMessage
                  icon="warning"
                  title="증상발현시간을 노출시간 이후로 바꿔주세요"
                  description="잠복기는 ‘노출 이후’ 경과시간으로 계산됩니다. 현재는 모두 노출 이전으로 입력되어 계산할 수 없습니다. 의심원 노출시간이 잘못 입력되었을 수도 있습니다."
                  :steps="[
                    { number: '!', text: `현재 노출시간: ${formattedExposureDateTime}` },
                    { number: '1', text: '상단 \'의심원 노출시간\' 입력란을 클릭해 올바른 기준시간으로 다시 설정합니다' },
                    { number: '2', text: '또는 데이터 입력 화면에서 각 환자의 \'증상발현시간\'을 노출시간 이후로 수정합니다' }
                  ]"
                />
              </div>
              <div v-else ref="incubationChartContainer" class="chart-instance" :style="{ width: incubationChartWidth + 'px' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- DateTimePicker 추가 -->
    <DateTimePicker 
      ref="exposureDateTimePickerRef"
      :visible="exposureDateTimePickerState.visible"
      :position="exposureDateTimePickerState.position"
      :initialValue="exposureDateTimePickerState.initialValue"
      @confirm="onExposureDateTimeConfirm"
      @cancel="onExposureDateTimeCancel"
    />
  </div>
</template>

<script setup>
// --- Script setup remains exactly the same ---
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  onActivated,
  watch,
  nextTick,
  markRaw
} from 'vue';
import { useStore } from 'vuex';
import { useStoreBridge } from '../store/storeBridge.js';
import { useUndoRedo } from '../hooks/useUndoRedo.js';
import * as echarts from 'echarts';
// 성능 최적화: lodash-es 임포트
import { debounce } from 'lodash-es';
// DateTimePicker 컴포넌트 import
import DateTimePicker from './DataInputVirtualScroll/parts/DateTimePicker.vue';
import DataGuideMessage from './DataGuideMessage.vue';

const store = useStore();
const storeBridge = useStoreBridge(store);
useUndoRedo(storeBridge);

// 기존 store를 직접 사용하여 즉시 반응성 보장
const rows = computed(() => store.getters.rows || []);

// '개별 노출 시간' 열 표시 여부 상태
const isIndividualExposureColumnVisible = computed(() => store.state.isIndividualExposureColumnVisible);

// 확진 여부 열 표시 여부 상태 추가
const isConfirmedCaseColumnVisible = computed(() => store.state.isConfirmedCaseColumnVisible);

// 확진자 꺾은선 표시 여부 상태 추가
const showConfirmedCaseLine = ref(true);

// 추정 감염원 상태 추가
const suspectedFood = ref(store.getters.getSelectedSuspectedFoods || '');

// 분석 상태 툴팁 함수
const getAnalysisStatusTooltip = (status) => {
  switch (status.type) {
  case 'success':
    return '통계 분석이 완료되었습니다. 추정 감염원을 선택할 수 있습니다.';
  case 'warning':
    if (status.message.includes('분석 대기 중')) {
      return '환자대조군 연구 또는 코호트 연구 탭에서 먼저 통계 분석을 수행해주세요.';
    } else {
      return '분석 데이터가 없습니다. 환자대조군 연구 또는 코호트 연구 탭에서 분석을 수행해주세요.';
    }
  case 'error':
    return '분석 데이터가 없습니다. 데이터를 입력하고 분석을 수행해주세요.';
  default:
    return '분석 상태를 확인 중입니다.';
  }
};

// 분석 결과 가져오기
const analysisResults = computed(() => {
  const results = store.getters.getAnalysisResults;
  // 현재 활성화된 분석 탭에 따라 결과 반환
  // 실제로는 현재 탭 정보를 가져와야 하지만, 임시로 caseControl 결과 반환
  return results.caseControl || results.cohort || [];
});

// 카이제곱 값이 낮은 순으로 정렬된 식단 목록
const sortedFoodItems = computed(() => {
  if (!analysisResults.value || analysisResults.value.length === 0) {
    return [];
  }
  
  return analysisResults.value
    .filter(item => item.pValue !== null) // p-value가 있는 항목만
    .sort((a, b) => {
      // p-value가 낮은 순으로 정렬
      if (a.pValue === null && b.pValue === null) return 0;
      if (a.pValue === null) return 1;
      if (b.pValue === null) return -1;
      return a.pValue - b.pValue;
    });
});

// 분석 결과가 있는지 확인 (백그라운드 분석 결과 활용)
const hasAnalysisResults = computed(() => {
  // 백그라운드 분석 결과가 있으면 우선 사용
  const analysisResults = store.getters.analysisResults;
  if (analysisResults && (analysisResults.caseControl?.length > 0 || analysisResults.cohort?.length > 0)) {
    return true;
  }
  
  // 기존 방식 (fallback)
  return sortedFoodItems.value.length > 0;
});

// 백그라운드 분석 결과를 활용한 식단 목록
const backgroundAnalysisFoods = computed(() => {
  const analysisResults = store.getters.analysisResults;
  
  if (!analysisResults) return [];
  
  // 환자대조군 분석 결과 우선 사용
  if (analysisResults.caseControl && analysisResults.caseControl.length > 0) {
    return analysisResults.caseControl.map(item => ({
      item: item.item,
      pValue: item.pValue,
      oddsRatio: item.oddsRatio,
      type: 'caseControl'
    }));
  }
  
  // 코호트 분석 결과 사용
  if (analysisResults.cohort && analysisResults.cohort.length > 0) {
    return analysisResults.cohort.map(item => ({
      item: item.item,
      pValue: null, // 코호트는 p-value가 없음
      relativeRisk: item.relativeRisk,
      type: 'cohort'
    }));
  }
  
  return [];
});

// 툴팁 위치 계산
const analysisTooltipStyle = computed(() => {
  if (!showAnalysisTooltip.value || !analysisTooltipRef.value) {
    return {};
  }
  
  const rect = analysisTooltipRef.value.getBoundingClientRect();
  const left = rect.left + (rect.width / 2);
  const top = rect.bottom + 5;
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translateX(-50%)'
  };
});

// 분석 상태 표시
const analysisStatus = computed(() => {
  const analysisResults = store.getters.analysisResults;
  
  // 디버깅을 위한 로그 추가
  console.log('analysisStatus 계산 중:', {
    analysisResults,
    caseControlLength: analysisResults?.caseControl?.length,
    cohortLength: analysisResults?.cohort?.length,
    hasAnalysisResults: hasAnalysisResults.value,
    backgroundAnalysisFoodsLength: backgroundAnalysisFoods.value.length
  });
  
  // 최종 조건 완화: 드롭다운이 작동하면 분석 완료로 간주
  if (hasAnalysisResults.value || backgroundAnalysisFoods.value.length > 0 || analysisResults) {
    const caseControlCount = analysisResults?.caseControl?.length || 0;
    const cohortCount = analysisResults?.cohort?.length || 0;
    
    if (caseControlCount > 0) {
      return {
        type: 'success',
        message: `환자대조군 분석 완료 (${caseControlCount}개 항목)`
      };
    } else if (cohortCount > 0) {
      return {
        type: 'success',
        message: `코호트 분석 완료 (${cohortCount}개 항목)`
      };
    } else {
      // 분석 결과 객체는 있지만 빈 배열인 경우도 분석 완료로 간주
      return {
        type: 'success',
        message: '분석 완료 (데이터 준비됨)'
      };
    }
  } else {
    return {
      type: 'warning',
      message: '분석 대기 중...'
    };
  }
});

// --- 커스텀 드롭다운 상태 ---
const isDropdownOpen = ref(false);
const selectedFoods = ref(new Set()); // 체크박스로 선택된 식단들
const showAnalysisTooltip = ref(false); // 분석 상태 툴팁 표시 여부
const analysisTooltipRef = ref(null); // 분석 상태 배지 참조


// DateTimePicker 관련 상태
const exposureDateTimePickerRef = ref(null);
const exposureDateTimePickerState = ref({
  visible: false,
  position: { top: 0, left: 0 },
  initialValue: null
});

const selectedSymptomInterval = computed({
  get: () => store.getters.getSelectedSymptomInterval,
  set: (value) => storeBridge.updateSymptomInterval(value)
});
const exposureDateTime = computed({
  get: () => store.getters.getExposureDateTime,
  set: (value) => storeBridge.updateExposureDateTime(value)
});
const selectedIncubationInterval = computed({
  get: () => store.getters.getSelectedIncubationInterval,
  set: (value) => storeBridge.updateIncubationInterval(value)
});

// Chart customization states (상태 관리 개선)
const fontSizes = [12, 15, 18, 21, 24];
const fontSizeLabels = ['매우 작게', '작게', '보통', '크게', '매우 크게'];
const chartWidths = [700, 900, 1100]; // 차트 너비 배열
const barColors = [
  '#5470c6', // 기본 파란색
  '#1E88E5', // 진한 파란색 (현재 유행곡선 하단 색상)
  '#29ABE2', // 밝은 파란색 (현재 유행곡선 상단 색상)  
  '#91cc75', // 녹색
  '#fac858', // 노란색
  '#ee6666', // 빨간색
  '#73c0de', // 하늘색
  '#3ba272', // 진한 녹색
  '#fc8452', // 주황색
  '#9a60b4', // 보라색
  '#ea7ccc' // 분홍색
];

// 유행곡선 차트 상태 - store에서 설정 불러오기
const chartSettings = computed(() => store.getters.getEpidemicCurveSettings);
const epiChartFontSize = ref(chartSettings.value.fontSize || 18); // 기본값 18
const epiChartWidth = ref(chartSettings.value.chartWidth || 1100);
const epiBarColor = ref(chartSettings.value.barColor || '#1E88E5');
const epiFontSizeButtonText = ref(fontSizeLabels[fontSizes.indexOf(epiChartFontSize.value)] || '보통');
const epiChartWidthButtonText = ref(`${epiChartWidth.value}px`);

// 잠복기 차트 상태 - store에서 설정 불러오기
const incubationChartSettings = computed(() => store.getters.getEpidemicCurveSettings);
const incubationChartFontSize = ref(incubationChartSettings.value.incubationFontSize || 18); // 기본값 18
const incubationChartWidth = ref(incubationChartSettings.value.incubationChartWidth || 1100);
const incubationBarColor = ref(incubationChartSettings.value.incubationBarColor || '#91cc75'); // 녹색으로 구분
const incubationFontSizeButtonText = ref(fontSizeLabels[fontSizes.indexOf(incubationChartFontSize.value)] || '보통');
const incubationChartWidthButtonText = ref(`${incubationChartWidth.value}px`);

// --- 차트 표시 모드 설정 ---
const chartDisplayMode = ref(chartSettings.value.displayMode || 'time'); // 'time' | 'datetime'
const incubationChartDisplayMode = ref(incubationChartSettings.value.incubationDisplayMode || 'hour'); // 'hour' | 'hhmm'

const activeTooltip = ref(null);
const tooltipText = ref('');

const showTooltip = (key, text) => {
  activeTooltip.value = key;
  tooltipText.value = text;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// 선택된 색상을 기반으로 그라디언트 생성하는 함수
const generateGradientColors = (baseColor) => {
  // 색상을 RGB로 변환
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // RGB를 HEX로 변환
  const rgb2hex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };
  
  // 밝기 조절 함수
  const adjustBrightness = (color, percent) => {
    const rgb = hex2rgb(color);
    if (!rgb) return color;
    
    const factor = percent / 100;
    const r = Math.min(255, Math.max(0, Math.round(rgb.r + (255 - rgb.r) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g + (255 - rgb.g) * factor)));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b + (255 - rgb.b) * factor)));
    
    return rgb2hex(r, g, b);
  };
  
  // 선택된 색상을 기준으로 밝은 색(상단)과 기본 색(하단) 생성
  const lightColor = adjustBrightness(baseColor, 40);
  const darkColor = baseColor;
  return { lightColor, darkColor };
};

// 잠복기 시간 라벨을 "HH:MM~HH:MM" 형식에서 "N~M시간" 형식으로 변환하는 함수
const formatIncubationLabel = (intervalLabel) => {
  try {
    // "00:00 ~ 03:00" 형식을 파싱
    const parts = intervalLabel.split(' ~ ');
    if (parts.length !== 2) return intervalLabel; // 형식이 맞지 않으면 원래 라벨 반환
    
    const startTime = parts[0].trim();
    const endTime = parts[1].trim();
    
    // HH:MM 형식에서 시간만 추출
    const startHour = parseInt(startTime.split(':')[0], 10);
    let endHour = parseInt(endTime.split(':')[0], 10);
    
    // 24시간을 0시로 처리하는 경우 대응
    if (endHour === 0 && startHour > 0) {
      endHour = 24;
    }
    
    return `${startHour}~${endHour}시간`;
  } catch (error) {
    console.warn('잠복기 라벨 포맷 변환 오류:', error, intervalLabel);
    return intervalLabel; // 오류 발생시 원래 라벨 반환
  }
};

// 상태 관리 개선: 데이터 유효성 검증 computed
const hasValidData = computed(() => {
  try {
    return Array.isArray(rows.value) && rows.value.length > 0;
  } catch (error) {
    console.error('hasValidData 계산 오류:', error);
    return false;
  }
});

const hasValidPatientData = computed(() => {
  try {
    if (!hasValidData.value) return false;
    return rows.value.some(row => row.isPatient === '1' && row.symptomOnset);
  } catch (error) {
    console.error('hasValidPatientData 계산 오류:', error);
    return false;
  }
});

const hasValidExposureData = computed(() => {
  try {
    if (!hasValidPatientData.value) {
      return false;
    }

    // 개별 노출 시간 모드인지 공통 노출 시간 모드인지에 따라 유효성 검사 분기
    if (isIndividualExposureColumnVisible.value) {
      // 개별 노출 시간 모드: 계산된 유효한 잠복기 데이터가 하나 이상 있는지 확인
      return incubationDurations.value.length > 0;
    } else {
      // 공통 노출 시간 모드: 설정된 공통 노출 시간이 유효한지 확인
      return exposureTimestamp.value !== null;
    }
  } catch (error) {
    console.error('hasValidExposureData 계산 오류:', error);
    return false;
  }
});

// 차트 상태 관리
const chartStates = computed(() => {
  return {
    hasEpiCurveData: symptomOnsetTableData.value.length > 1, // 빈 행 제외하고 실제 데이터가 있는지
    hasIncubationData: incubationPeriodTableData.value.length > 1,
    isEpiCurveReady: hasValidPatientData.value,
    isIncubationReady: hasValidExposureData.value
  };
});

// Utility functions for cycling through values (개선된 상태 관리)

/**
 * 배열에서 다음 값을 순환적으로 반환
 * @param {any} currentValue - 현재 값
 * @param {Array} valueArray - 값 배열
 * @returns {any} 다음 값
 */
const getNextValue = (currentValue, valueArray) => {
  try {
    if (!Array.isArray(valueArray) || valueArray.length === 0) {
      console.warn('getNextValue: 유효하지 않은 배열:', valueArray);
      return currentValue;
    }
    
    const currentIndex = valueArray.indexOf(currentValue);
    if (currentIndex === -1) return valueArray[0];
    const nextIndex = (currentIndex + 1) % valueArray.length;
    return valueArray[nextIndex];
  } catch (error) {
    console.error('getNextValue 오류:', error);
    return currentValue;
  }
};



// 유행곡선 차트 마우스 이벤트 핸들러
const handleEpiFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(epiChartFontSize.value);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  epiFontSizeButtonText.value = nextFontSize;
  showTooltip('epiFontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};
const handleEpiFontSizeMouseLeave = () => {
  const currentIndex = fontSizes.indexOf(epiChartFontSize.value);
  epiFontSizeButtonText.value = fontSizeLabels[currentIndex];
  hideTooltip();
};
const handleEpiChartWidthMouseEnter = () => {
  const currentIndex = chartWidths.indexOf(epiChartWidth.value);
  const nextIndex = (currentIndex + 1) % chartWidths.length;
  const nextWidth = chartWidths[nextIndex];
  epiChartWidthButtonText.value = `${nextWidth}px`;
  showTooltip('epiChartWidth', `차트 너비를 ${nextWidth}px로 변경합니다`);
};
const handleEpiChartWidthMouseLeave = () => {
  epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
  hideTooltip();
};

// 잠복기 차트 마우스 이벤트 핸들러
const handleIncubationFontSizeMouseEnter = () => {
  const currentIndex = fontSizes.indexOf(incubationChartFontSize.value);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextFontSize = fontSizeLabels[nextIndex];
  incubationFontSizeButtonText.value = nextFontSize;
  showTooltip('incubationFontSize', `폰트 크기를 ${nextFontSize}로 변경합니다`);
};
const handleIncubationFontSizeMouseLeave = () => {
  const currentIndex = fontSizes.indexOf(incubationChartFontSize.value);
  incubationFontSizeButtonText.value = fontSizeLabels[currentIndex];
  hideTooltip();
};
const handleIncubationChartWidthMouseEnter = () => {
  const currentIndex = chartWidths.indexOf(incubationChartWidth.value);
  const nextIndex = (currentIndex + 1) % chartWidths.length;
  const nextWidth = chartWidths[nextIndex];
  incubationChartWidthButtonText.value = `${nextWidth}px`;
  showTooltip('incubationChartWidth', `차트 너비를 ${nextWidth}px로 변경합니다`);
};
const handleIncubationChartWidthMouseLeave = () => {
  incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
  hideTooltip();
};

// 유행곡선 차트 사이클 버튼 핸들러
const cycleEpiFontSize = () => {
  epiChartFontSize.value = getNextValue(epiChartFontSize.value, fontSizes);
  const currentIndex = fontSizes.indexOf(epiChartFontSize.value);
  epiFontSizeButtonText.value = fontSizeLabels[currentIndex];
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { fontSize: epiChartFontSize.value });
  nextTick(safeUpdateCharts);
};
const cycleEpiChartWidth = () => {
  epiChartWidth.value = getNextValue(epiChartWidth.value, chartWidths);
  epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { chartWidth: epiChartWidth.value });
};
const cycleEpiBarColor = () => {
  epiBarColor.value = getNextValue(epiBarColor.value, barColors);
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { barColor: epiBarColor.value });
  nextTick(safeUpdateCharts);
};

// 잠복기 차트 사이클 버튼 핸들러
const cycleIncubationFontSize = () => {
  incubationChartFontSize.value = getNextValue(
    incubationChartFontSize.value,
    fontSizes
  );
  const currentIndex = fontSizes.indexOf(incubationChartFontSize.value);
  incubationFontSizeButtonText.value = fontSizeLabels[currentIndex];
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { 
    incubationFontSize: incubationChartFontSize.value 
  });
  nextTick(safeUpdateCharts);
};
const cycleIncubationChartWidth = () => {
  incubationChartWidth.value = getNextValue(
    incubationChartWidth.value,
    chartWidths
  );
  incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { 
    incubationChartWidth: incubationChartWidth.value 
  });
};
const cycleIncubationBarColor = () => {
  incubationBarColor.value = getNextValue(
    incubationBarColor.value,
    barColors
  );
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { 
    incubationBarColor: incubationBarColor.value 
  });
  nextTick(safeUpdateCharts);
};

// --- 차트 표시 모드 선택 함수 ---
const selectDisplayMode = (mode) => {
  chartDisplayMode.value = mode;
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { displayMode: mode });
  nextTick(safeUpdateCharts);
};

// --- 잠복기 차트 표시 모드 선택 함수 ---
const selectIncubationDisplayMode = (mode) => {
  incubationChartDisplayMode.value = mode;
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { incubationDisplayMode: mode });
  nextTick(safeUpdateCharts);
};

// Chart export functions
const exportChart = async () => {
  const instance = epiCurveChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('차트 내보내기 불가');
    return;
  }
  const filename = `유행곡선_${selectedSymptomInterval.value}시간_${new Date().toISOString().split('T')[0]}.png`;
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${epiChartWidth.value}px`;
    tempContainer.style.height = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    const tempChart = echarts.init(tempContainer);
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    console.log('유행곡선 차트 저장 완료:', filename);
  } catch (error) {
    const message = `차트 내보내기 오류: ${error.message}`;
    console.error(message);
    alert(message);
  }
};

const isSymptomTableCopied = ref(false);
const isIncubationTableCopied = ref(false);
const isEpiChartCopied = ref(false);
const isIncubationChartCopied = ref(false);

const copySymptomTableToClipboard = async () => {
  const tableEl = document.querySelector('.output-row .table-container .frequency-table');
  if (!tableEl) { 
    isSymptomTableCopied.value = false; 
    return; 
  }
  
  try {
    // 성능 최적화: DocumentFragment 사용하여 DOM 조작 최소화
    const tempTable = tableEl.cloneNode(true);
    
    // 스타일 객체로 한 번에 적용
    const tableStyles = {
      borderCollapse: 'collapse',
      border: '1px solid #888',
      fontSize: '14px',
      width: '100%'
    };
    Object.assign(tempTable.style, tableStyles);
    
    const cellStyles = {
      border: '1px solid #888',
      padding: '8px 4px',
      textAlign: 'center'
    };
    
    const headerStyles = {
      ...cellStyles,
      background: '#f2f2f2',
      fontWeight: 'bold'
    };
    
    // 배치 스타일 적용
    tempTable.querySelectorAll('th').forEach(th => {
      Object.assign(th.style, headerStyles);
    });
    
    tempTable.querySelectorAll('td').forEach(td => {
      Object.assign(td.style, cellStyles);
    });
    
    tempTable.querySelectorAll('tbody tr').forEach(tr => {
      const firstTd = tr.querySelector('td');
      if (firstTd) firstTd.style.textAlign = 'left';
    });
    
    const html = tempTable.outerHTML;
    const text = tableEl.innerText;
    
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    
    isSymptomTableCopied.value = true;
    setTimeout(() => (isSymptomTableCopied.value = false), 1500);
  } catch (e) { 
    console.error('증상 테이블 복사 오류:', e);
    isSymptomTableCopied.value = false; 
  }
};

const copyIncubationTableToClipboard = async () => {
  const tableEl = document.querySelectorAll('.output-row .table-container .frequency-table')[1];
  if (!tableEl) { 
    isIncubationTableCopied.value = false; 
    return; 
  }
  
  try {
    // 성능 최적화: 동일한 패턴으로 최적화
    const tempTable = tableEl.cloneNode(true);
    
    const tableStyles = {
      borderCollapse: 'collapse',
      border: '1px solid #888',
      fontSize: '14px',
      width: '100%'
    };
    Object.assign(tempTable.style, tableStyles);
    
    const cellStyles = {
      border: '1px solid #888',
      padding: '8px 4px',
      textAlign: 'center'
    };
    
    const headerStyles = {
      ...cellStyles,
      background: '#f2f2f2',
      fontWeight: 'bold'
    };
    
    tempTable.querySelectorAll('th').forEach(th => {
      Object.assign(th.style, headerStyles);
    });
    
    tempTable.querySelectorAll('td').forEach(td => {
      Object.assign(td.style, cellStyles);
    });
    
    tempTable.querySelectorAll('tbody tr').forEach(tr => {
      const firstTd = tr.querySelector('td');
      if (firstTd) firstTd.style.textAlign = 'left';
    });
    
    const html = tempTable.outerHTML;
    const text = tableEl.innerText;
    
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    
    isIncubationTableCopied.value = true;
    setTimeout(() => (isIncubationTableCopied.value = false), 1500);
  } catch (e) { 
    console.error('잠복기 테이블 복사 오류:', e);
    isIncubationTableCopied.value = false; 
  }
};

const copyChartToClipboard = async () => {
  const instance = epiCurveChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    isEpiChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    isEpiChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === 'undefined') {
    isEpiChartCopied.value = false;
    return;
  }
  
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${epiChartWidth.value}px`;
    tempContainer.style.height = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    const tempChart = echarts.init(tempContainer);
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.statusText}`);
    }
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    isEpiChartCopied.value = true;
    setTimeout(() => (isEpiChartCopied.value = false), 1500);
    console.log('유행곡선 차트 복사 완료');
  } catch (error) {
    console.error('유행곡선 차트 복사 오류:', error);
    isEpiChartCopied.value = false;
  }
};

const copyIncubationChartToClipboard = async () => {
  const instance = incubationChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    isIncubationChartCopied.value = false;
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.write) {
    isIncubationChartCopied.value = false;
    return;
  }
  if (typeof ClipboardItem === 'undefined') {
    isIncubationChartCopied.value = false;
    return;
  }
  
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${incubationChartWidth.value}px`;
    tempContainer.style.height = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    const tempChart = echarts.init(tempContainer);
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.statusText}`);
    }
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    isIncubationChartCopied.value = true;
    setTimeout(() => (isIncubationChartCopied.value = false), 1500);
    console.log('잠복기 차트 복사 완료');
  } catch (error) {
    console.error('잠복기 차트 복사 오류:', error);
    isIncubationChartCopied.value = false;
  }
};

// --- Helper Functions (타입 안전성 강화) ---

/**
 * 날짜를 MM-dd HH:mm 형식으로 포맷팅 (구간 시작점용)
 * @param {Date} date - 포맷팅할 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 또는 빈 문자열
 */
const formatDateTime = (date) => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatDateTime: 유효하지 않은 날짜:', date);
      return '';
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('formatDateTime 오류:', error, 'date:', date);
    return '';
  }
};

/**
 * 날짜를 MM-dd HH:mm 형식으로 포맷팅 (구간 끝점용 - XX:59로 표시)
 * @param {Date} date - 포맷팅할 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 또는 빈 문자열
 */
const formatDateTimeEnd = (date) => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatDateTimeEnd: 유효하지 않은 날짜:', date);
      return '';
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    // 구간 끝점은 항상 59분으로 표시
    const minutes = '59';
    return `${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('formatDateTimeEnd 오류:', error, 'date:', date);
    return '';
  }
};

/**
 * 주어진 타임스탬프를 지정된 시간 간격의 시작점으로 내림 처리
 * @param {number} timestamp - 처리할 타임스탬프 (밀리초)
 * @param {number} intervalHours - 시간 간격 (시간 단위)
 * @returns {number} 간격 시작점의 타임스탬프 또는 NaN
 */
const floorToIntervalStart = (timestamp, intervalHours) => {
  try {
    if (isNaN(timestamp) || isNaN(intervalHours) || intervalHours <= 0) {
      console.warn('floorToIntervalStart: 유효하지 않은 파라미터:', { timestamp, intervalHours });
      return NaN;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('floorToIntervalStart: 유효하지 않은 타임스탬프:', timestamp);
      return NaN;
    }
    
    const localHours = date.getHours();
    const startHour = Math.floor(localHours / intervalHours) * intervalHours;
    const blockStartDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startHour,
      0,
      0,
      0
    );
    
    const result = blockStartDate.getTime();
    return !isNaN(result) ? result : NaN;
  } catch (error) {
    console.error('floorToIntervalStart 오류:', error, { timestamp, intervalHours });
    return NaN;
  }
};

/**
 * 밀리초 단위의 기간을 HH:MM 형식으로 포맷팅
 * @param {number} durationMillis - 기간 (밀리초)
 * @returns {string} HH:MM 형식의 문자열 또는 "--:--"
 */
const formatDurationHHMM = (durationMillis) => {
  try {
    // Handle NaN or invalid inputs gracefully
    if (isNaN(durationMillis) || durationMillis < 0) {
      console.warn('formatDurationHHMM: 유효하지 않은 duration:', durationMillis);
      return '--:--';
    }
    
    const totalMinutes = Math.round(durationMillis / (60 * 1000)); // Round to nearest minute
    if (isNaN(totalMinutes)) {
      console.warn('formatDurationHHMM: totalMinutes 계산 실패:', durationMillis);
      return '--:--';
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('formatDurationHHMM 오류:', error, 'duration:', durationMillis);
    return '--:--';
  }
};



/**
 * 날짜를 YYYY-MM-dd HH:mm 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 또는 "N/A"
 */
const formatShortDateTime = (date) => {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('formatShortDateTime: 유효하지 않은 날짜:', date);
      return 'N/A';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('formatShortDateTime 오류:', error, 'date:', date);
    return 'N/A';
  }
};

// --- Symptom Onset Data Calculations ---
const patientOnsetTimes = computed(() => {
  if (!rows.value || rows.value.length === 0) return [];
  return rows.value
    .filter((r) => r.isPatient === '1' && r.symptomOnset)
    .map((r) => {
      try {
        // Handle potential timezone issues by ensuring 'T' separator
        const dateStr = r.symptomOnset.includes('T')
          ? r.symptomOnset
          : r.symptomOnset.replace(' ', 'T');
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    })
    .filter((d) => d)
    .sort((a, b) => a.getTime() - b.getTime());
});
const firstOnsetTime = computed(() =>
  patientOnsetTimes.value.length > 0 ? patientOnsetTimes.value[0] : null
);
const lastOnsetTime = computed(() =>
  patientOnsetTimes.value.length > 0
    ? patientOnsetTimes.value[patientOnsetTimes.value.length - 1]
    : null
);
const formattedFirstOnsetTime = computed(() =>
  formatShortDateTime(firstOnsetTime.value)
);
const formattedLastOnsetTime = computed(() =>
  formatShortDateTime(lastOnsetTime.value)
);

// 의심원 노출시간 포맷팅 (YYYY-MM-DD HH:MM 형식)
const formattedExposureDateTime = computed(() => {
  if (!exposureDateTime.value) return '';
  
  try {
    const date = new Date(exposureDateTime.value);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('노출시간 포맷팅 오류:', error);
    return '';
  }
});
const symptomOnsetTableData = computed(() => {
  const intervalHours = selectedSymptomInterval.value;
  if (
    !intervalHours ||
    !patientOnsetTimes.value ||
    patientOnsetTimes.value.length === 0 ||
    !firstOnsetTime.value || // Ensure first/last onset times are valid
    !lastOnsetTime.value
  )
    return [];

  const intervalMillis = intervalHours * 3600000;
  const minTimestamp = firstOnsetTime.value.getTime();
  const maxTimestamp = lastOnsetTime.value.getTime();

  // 🔥 NEW: 양쪽 패딩 구간 설정 (앞뒤로 1개씩)
  const PADDING_INTERVALS_BEFORE = 1;
  const PADDING_INTERVALS_AFTER = 1;

  // Ensure blockStart is valid before proceeding
  const blockStartTimestamp = floorToIntervalStart(minTimestamp, intervalHours);
  if (isNaN(blockStartTimestamp)) {
    console.error('Invalid blockStartTimestamp calculated.');
    return []; // Return empty if calculation fails
  }

  // 🔥 NEW: 첫 환자가 속한 구간을 찾은 후, 그 이전 1개 구간부터 시작
  let firstPatientIntervalStart = blockStartTimestamp;
  while (firstPatientIntervalStart > minTimestamp) {
    firstPatientIntervalStart -= intervalMillis;
  }
  // 첫 환자가 실제로 구간에 포함되는지 확인
  if (minTimestamp >= firstPatientIntervalStart + intervalMillis) {
    firstPatientIntervalStart += intervalMillis;
  }
  
  // 🔥 NEW: 첫 환자 구간 이전에 패딩 구간 추가
  const firstIntervalStart = firstPatientIntervalStart - (PADDING_INTERVALS_BEFORE * intervalMillis);

  // 🔥 NEW: 마지막 환자 이후 1개 구간을 추가하여 종료점 확장
  const extendedMaxTimestamp = maxTimestamp + (PADDING_INTERVALS_AFTER * intervalMillis);

  const data = [];
  let currentIntervalStart = firstIntervalStart;
  let guard = 0; // Loop guard

  // 🔥 NEW: 확장된 종료점까지 처리
  while (currentIntervalStart <= extendedMaxTimestamp && guard < 1000) {
    const currentIntervalEnd = currentIntervalStart + intervalMillis;
    
    // 성능 최적화: filter 대신 for 루프 사용
    let count = 0;
    for (const time of patientOnsetTimes.value) {
      const timestamp = time.getTime();
      if (timestamp >= currentIntervalStart && timestamp < currentIntervalEnd) {
        count++;
      }
    }

    // 🔥 NEW: 모든 구간을 추가 (0명인 구간도 포함)
    // 구간 끝점을 1분 빼서 XX:59로 표시
    const displayEndTime = new Date(currentIntervalEnd - 60000); // 1분 빼기
    data.push({
      intervalLabel: `${formatDateTime(
        new Date(currentIntervalStart)
      )} ~ ${formatDateTimeEnd(displayEndTime)}`,
      count
    });

    currentIntervalStart = currentIntervalEnd;
    guard++;
  }
  if (guard >= 1000) console.error('Loop guard hit in symptom onset');

  return data;
});



// --- Incubation Period Data Calculations ---
const exposureTimestamp = computed(() => {
  const expStr = exposureDateTime.value;
  if (!expStr) return null;
  try {
    const dateStr = expStr.includes('T') ? expStr : expStr.replace(' ', 'T');
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
});

// NEW: Calculate raw incubation durations in milliseconds
const incubationDurations = computed(() => {
  const patientRows = rows.value.filter(row => row.isPatient === '1');
  
  if (isIndividualExposureColumnVisible.value) {
    // 개별 노출 시간 사용
    return patientRows.map(row => {
      if (!row.symptomOnset || !row.individualExposureTime) {
        return null;
      }
      const onset = new Date(row.symptomOnset);
      const exposure = new Date(row.individualExposureTime);

      if (isNaN(onset.getTime()) || isNaN(exposure.getTime()) || onset < exposure) {
        return null;
      }
      
      return onset.getTime() - exposure.getTime();
    }).filter(duration => duration !== null);
  } else {
    // 공통 노출 시간 사용
    const exposureDate = new Date(exposureDateTime.value);
    if (isNaN(exposureDate.getTime())) return [];

    return patientRows.map(row => {
      if (!row.symptomOnset) {
        return null;
      }
      const onset = new Date(row.symptomOnset);
      if (isNaN(onset.getTime()) || onset < exposureDate) {
        return null;
      }
      return onset.getTime() - exposureDate.getTime();
    }).filter(duration => duration !== null);
  }
});

// NEW: Calculate summary statistics for incubation period
const minIncubationPeriodFormatted = computed(() => {
  if (incubationDurations.value.length === 0) return '--:--';
  const minDuration = Math.min(...incubationDurations.value);
  return formatDurationHHMM(minDuration);
});

const maxIncubationPeriodFormatted = computed(() => {
  if (incubationDurations.value.length === 0) return '--:--';
  const maxDuration = Math.max(...incubationDurations.value);
  return formatDurationHHMM(maxDuration);
});

const avgIncubationPeriodFormatted = computed(() => {
  if (incubationDurations.value.length === 0) return '--:--';
  const sum = incubationDurations.value.reduce((acc, val) => acc + val, 0);
  const avgDuration = sum / incubationDurations.value.length;
  return formatDurationHHMM(avgDuration);
});

const medianIncubationPeriodFormatted = computed(() => {
  if (incubationDurations.value.length === 0) return '--:--';
  const sortedDurations = [...incubationDurations.value].sort((a, b) => a - b);
  const mid = Math.floor(sortedDurations.length / 2);
  let medianDuration;
  if (sortedDurations.length % 2 === 0) {
    // Even number of values: average the two middle ones
    medianDuration = (sortedDurations[mid - 1] + sortedDurations[mid]) / 2;
  } else {
    // Odd number of values: take the middle one
    medianDuration = sortedDurations[mid];
  }
  return formatDurationHHMM(medianDuration);
});


const incubationPeriodTableData = computed(() => {
  const intervalHours = selectedIncubationInterval.value;
  const durations = incubationDurations.value; // Use the calculated durations

  if (!intervalHours || durations.length === 0) {
    return [];
  }

  const intervalMillis = intervalHours * 3600000;
  const maxDuration = Math.max(...durations);
  
  // 🔥 NEW: 선점(Pre-fill) 방식으로 모든 구간을 미리 생성
  const totalBins = Math.ceil((maxDuration + intervalMillis) / intervalMillis);
  const bins = Array(totalBins).fill(0);
  
  // 실제 데이터를 해당 bin에 배치
  for (const duration of durations) {
    const binIndex = Math.floor(duration / intervalMillis);
    if (binIndex >= 0 && binIndex < totalBins) {
      bins[binIndex]++;
    }
  }
  
  // 모든 구간을 데이터로 변환 (0건 구간도 포함)
  const data = bins.map((count, index) => {
    const startTime = index * intervalMillis;
    const endTime = (index + 1) * intervalMillis;
    
    // 시:분 단위 모드에서는 끝점을 1분 빼서 XX:59로 표시
    let intervalLabel;
    if (incubationChartDisplayMode.value === 'hhmm') {
      const displayEndTime = endTime - 60000; // 1분 빼기
      intervalLabel = `${formatDurationHHMM(startTime)} ~ ${formatDurationHHMM(displayEndTime)}`;
    } else {
      // 시간 단위 모드에서는 기존 방식 유지
      intervalLabel = `${formatDurationHHMM(startTime)} ~ ${formatDurationHHMM(endTime)}`;
    }
    
    return {
      intervalLabel,
      count
    };
  });

  return data;
});


// --- Chart Instances ---
const epiCurveChartContainer = ref(null);
const incubationChartContainer = ref(null);
const epiCurveChartInstance = ref(null);
const incubationChartInstance = ref(null);

// ReportWriter에서 접근할 수 있도록 전역으로 노출
const exposeChartInstance = () => {
  if (epiCurveChartInstance.value) {
    window.epidemicCurveChartInstance = epiCurveChartInstance.value;
  }
};

// --- Chart Options Generation (에러 처리 강화) ---

/**
 * y축 최대값을 데이터 최댓값에 따라 여유 있게 반환
 * @param {number} maxValue - 데이터 최댓값
 * @returns {number} y축 최대값
 */
function getNiceYAxisMax(maxValue) {
  if (maxValue < 10) {
    return Math.max(maxValue + 1, Math.ceil(maxValue * 1.1));
  }
  if (maxValue < 20) {
    return Math.ceil(maxValue / 5) * 5;
  }
  // 20 이상은 10의 단위로 올림
  return Math.ceil((maxValue * 1.1) / 10) * 10;
}

/**
 * y축 최대값과 간격(step)을 계산하여 yMax가 step의 배수로 떨어지도록 반환
 * @param {number} maxValue - 데이터 최댓값
 * @returns {{yMax: number, step: number}}
 */
function getNiceYAxisMaxAndStep(maxValue) {
  let yMax = getNiceYAxisMax(maxValue);
  // 적절한 step 구하기 (1, 2, 5, 10, 20, 50, 100 등)
  let step = 1;
  if (yMax > 100) step = 20;
  else if (yMax > 50) step = 10;
  else if (yMax > 20) step = 5;
  else if (yMax > 10) step = 2;
  // yMax를 step의 배수로 올림
  yMax = Math.ceil(yMax / step) * step;
  return { yMax, step };
}

// 확진자 증상발현시간 데이터 계산 추가
const confirmedCaseOnsetTimes = computed(() => {
  if (!rows.value || rows.value.length === 0) return [];
  return rows.value
    .filter((r) => r.isPatient === '1' && r.symptomOnset && r.isConfirmedCase === '1')
    .map((r) => {
      try {
        const dateStr = r.symptomOnset.includes('T')
          ? r.symptomOnset
          : r.symptomOnset.replace(' ', 'T');
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    })
    .filter((d) => d)
    .sort((a, b) => a.getTime() - b.getTime());
});

// 확진자 증상발현시간 테이블 데이터 계산 추가
const confirmedCaseOnsetTableData = computed(() => {
  const intervalHours = selectedSymptomInterval.value;
  if (
    !intervalHours ||
    !confirmedCaseOnsetTimes.value ||
    confirmedCaseOnsetTimes.value.length === 0 ||
    !firstOnsetTime.value ||
    !lastOnsetTime.value
  )
    return [];

  const intervalMillis = intervalHours * 3600000;
  const minTimestamp = firstOnsetTime.value.getTime();
  const maxTimestamp = lastOnsetTime.value.getTime();

  const PADDING_INTERVALS_BEFORE = 1;
  const PADDING_INTERVALS_AFTER = 1;

  const blockStartTimestamp = floorToIntervalStart(minTimestamp, intervalHours);
  if (isNaN(blockStartTimestamp)) {
    console.error('Invalid blockStartTimestamp calculated for confirmed cases.');
    return [];
  }

  let firstPatientIntervalStart = blockStartTimestamp;
  while (firstPatientIntervalStart > minTimestamp) {
    firstPatientIntervalStart -= intervalMillis;
  }
  if (minTimestamp >= firstPatientIntervalStart + intervalMillis) {
    firstPatientIntervalStart += intervalMillis;
  }
  
  const firstIntervalStart = firstPatientIntervalStart - (PADDING_INTERVALS_BEFORE * intervalMillis);
  const extendedMaxTimestamp = maxTimestamp + (PADDING_INTERVALS_AFTER * intervalMillis);

  const data = [];
  let currentIntervalStart = firstIntervalStart;
  let guard = 0;

  while (currentIntervalStart <= extendedMaxTimestamp && guard < 1000) {
    const currentIntervalEnd = currentIntervalStart + intervalMillis;
    
    let count = 0;
    for (const time of confirmedCaseOnsetTimes.value) {
      const timestamp = time.getTime();
      if (timestamp >= currentIntervalStart && timestamp < currentIntervalEnd) {
        count++;
      }
    }

    const displayEndTime = new Date(currentIntervalEnd - 60000);
    data.push({
      intervalLabel: `${formatDateTime(
        new Date(currentIntervalStart)
      )} ~ ${formatDateTimeEnd(displayEndTime)}`,
      count
    });

    currentIntervalStart = currentIntervalEnd;
    guard++;
  }
  if (guard >= 1000) console.error('Loop guard hit in confirmed case symptom onset');

  return data;
});

/**
 * 일시 모드일 때만 적용되는 동적 왼쪽 여백 계산
 * @returns {string} 계산된 왼쪽 여백 값
 */
const getDynamicLeftMargin = () => {
  if (chartDisplayMode.value !== 'datetime') {
    return '3%'; // 시간 모드는 기존 값 유지
  }
  
  // 폰트 크기에 따른 기본 여백 (더 큰 기본값)
  const baseMargin = 80; // 기본 80px로 증가
  const fontSize = epiChartFontSize.value || 15;
  
  // 폰트 크기가 클수록 여백 증가 (폰트 크기당 더 큰 값으로 증가)
  let fontSizeAdjustment;
  if (fontSize <= 15) {
    fontSizeAdjustment = 0;
  } else if (fontSize <= 18) {
    fontSizeAdjustment = (fontSize - 15) * 8;
  } else if (fontSize <= 21) {
    fontSizeAdjustment = (fontSize - 15) * 9;
  } else {
    fontSizeAdjustment = (fontSize - 15) * 15;
  }
  
  // 최소 여백 보장 (더 큰 최소값)
  const minMargin = 80;
  const calculatedMargin = Math.max(minMargin, baseMargin + fontSizeAdjustment);
  
  console.log('동적 왼쪽 여백 계산:', {
    mode: chartDisplayMode.value,
    fontSize,
    baseMargin,
    fontSizeAdjustment,
    calculatedMargin
  });
  
  return `${calculatedMargin}px`;
};

/**
 * 유행곡선 차트 옵션 생성
 * @returns {Object} ECharts 옵션 객체
 */
const generateEpiCurveChartOptions = () => {
  try {
    const data = symptomOnsetTableData.value;
    
    if (!Array.isArray(data)) {
      console.error('generateEpiCurveChartOptions: data가 배열이 아님:', data);
      return { title: { text: '데이터 형식 오류' } };
    }
    
    // 🔥 NEW: 이제 모든 데이터를 사용 (패딩 구간 포함)
    const validData = data;
    if (!validData || validData.length === 0) {
      console.warn('generateEpiCurveChartOptions: 유효한 데이터가 없음');
      return { 
        title: { 
          text: '유행곡선 데이터가 필요합니다',
          subtext: '증상발현시간 데이터를 입력하면 유행곡선이 자동으로 생성됩니다',
          left: 'center',
          textStyle: { 
            fontSize: 18, 
            fontFamily: 'Noto Sans KR, sans-serif',
            color: '#666'
          },
          subtextStyle: {
            fontSize: 14,
            color: '#999'
          }
        },
        graphic: {
          type: 'text',
          left: 'center',
          top: '60%',
          style: {
            text: '📊 증상발현시간 입력 → 유행곡선 생성',
            fontSize: 16,
            fill: '#1a73e8',
            fontFamily: 'Noto Sans KR, sans-serif'
          }
        }
      };
    }

    // --- 제공된 최종 예제 코드를 기반으로 로직 재구성 ---

    // 1. 데이터 가공 (모드에 따른 날짜/시간 포맷팅)
    const processedData = validData.map(item => {
      const intervalLabel = item.intervalLabel;
      const parts = intervalLabel.split(' ~ ');
      const startDateStr = parts[0]; // "04-08 00:00"
        
      const datePart = startDateStr.split(' ')[0]; // "04-08"
      const timePart = startDateStr.split(' ')[1]; // "00:00"

      const [month, day] = datePart.split('-').map(p => parseInt(p, 10));

      const year = new Date().getFullYear();
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeekMap = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = dayOfWeekMap[dateObj.getDay()];

      const formattedDate = `${month}. ${day}.(${dayOfWeek})`;

      const startTime = timePart.split(':')[0];
        
      // 모드에 따른 시간 표시 결정
      let formattedTime;
      if (chartDisplayMode.value === 'datetime') {
        // 날짜+시간 모드: 테이블과 동일한 형식
        formattedTime = item.intervalLabel; // "04-07 18:00 ~ 04-07 23:59"
      } else {
        // 시 단위 모드: 기존 로직
        const startHour = parseInt(startTime, 10);
        const intervalHours = selectedSymptomInterval.value || 3;
        const endHour = (startHour + intervalHours) % 24;
        formattedTime = `${startHour}~${endHour === 0 ? 24 : endHour}시`;
      }

      return {
        formattedDate,
        formattedTime,
        value: Number(item.count) || 0
      };
    });
    
    const timeData = processedData.map(item => item.formattedTime);
    const seriesData = processedData.map(item => item.value);

    // 확진자 데이터 처리
    const confirmedCaseData = confirmedCaseOnsetTableData.value;
    const confirmedCaseSeriesData = confirmedCaseData.map(item => item.count);

    // 2. 날짜 그룹 정보 생성
    const dateGroups = [];
    const dateMap = new Map();
    processedData.forEach((item, index) => {
      if (!dateMap.has(item.formattedDate)) {
        dateMap.set(item.formattedDate, { startIndex: index, count: 0 });
      }
      dateMap.get(item.formattedDate).count++;
    });
    dateMap.forEach((value, key) => {
      dateGroups.push({ name: key, ...value });
    });

    // y축 최대값과 간격 계산 (전체 환자와 확진자 모두 고려)
    const allValues = [...seriesData, ...confirmedCaseSeriesData];
    const maxValue = Math.max(...allValues);
    const { yMax, step } = getNiceYAxisMaxAndStep(maxValue);

    return {
      textStyle: {
        fontFamily: 'Noto Sans KR, sans-serif'
      },
      title: {
        text: '시간별 발생자 수',
        left: 'center',
        textStyle: { fontSize: (epiChartFontSize.value || 15) + 4, fontWeight: 'bold' },
        top: 15
      },
      // 추정 감염원 풋노트 추가
      ...(suspectedFood.value.trim() && {
        graphic: [{
          type: 'text',
          left: '5%', // 적당한 위치로 조정
          bottom: '5%', // 차트 영역 하단
          style: {
            text: `추정 감염원 : ${suspectedFood.value}`,
            fontSize: epiChartFontSize.value || 15,
            fill: '#333',
            fontWeight: 'normal'
          }
        }]
      }),
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const dataIndex = params[0].dataIndex;
          const item = processedData[dataIndex];
          const confirmedCaseCount = confirmedCaseSeriesData[dataIndex] || 0;
          
          let tooltipContent = '';
          if (chartDisplayMode.value === 'datetime') {
            // 날짜+시간 모드: 간단한 툴팁
            tooltipContent = `<strong>${item.formattedTime}</strong><br/>환자 수: <strong>${item.value}</strong> 명`;
          } else {
            // 시 단위 모드: 기존 툴팁
            tooltipContent = `<strong>${item.formattedDate}</strong><br/>${item.formattedTime} : <strong>${item.value}</strong> 명`;
          }
          
          // 확진자 정보 추가
          if (isConfirmedCaseColumnVisible.value && showConfirmedCaseLine.value && confirmedCaseCount > 0) {
            tooltipContent += `<br/>확진자 수: <strong style="color: #e74c3c;">${confirmedCaseCount}</strong> 명`;
          }
          
          return tooltipContent;
        }
      },
      grid: {
        left: getDynamicLeftMargin(), // 동적 여백 적용
        right: chartDisplayMode.value === 'datetime' ? 60 : '4%',
        bottom: suspectedFood.value.trim() ? '15%' : '7%', // 추정 감염원이 있으면 하단 여백 증가
        top: 80, // 제목과 그래프 사이 간격 확보
        containLabel: true
      },
      xAxis: (
        chartDisplayMode.value === 'datetime'
          ? [
            {
              type: 'category',
              data: timeData,
              axisLine: { show: true, onZero: false },
              axisTick: { show: false },
              axisLabel: {
                interval: 0,
                color: '#333',
                fontSize: epiChartFontSize.value || 15,
                margin: 10,
                rotate: 45 // 날짜+시간 모드일 때만 기울기 적용
              },
              splitLine: { show: false },
              boundaryGap: [0.18, 0.18]
            }
          ]
          : [
            {
              type: 'category',
              data: timeData,
              axisLine: { show: true, onZero: false },
              axisTick: { show: false },
              axisLabel: {
                interval: 0,
                color: '#333',
                fontSize: epiChartFontSize.value || 15,
                margin: 10,
                rotate: 0
              },
              splitLine: { show: false },
              boundaryGap: true
            },
            {
              type: 'category',
              position: 'bottom',
              offset: 35, // 라벨 높이에 따라 조절
              axisLine: { show: true, lineStyle: { color: '#cccccc', width: 2 } },
              axisTick: {
                show: true,
                inside: false,
                length: 70, // offset과 동일하게 설정하여 위쪽 축에 닿도록 함
                lineStyle: { color: '#cccccc', width: 2 },
                interval: (index, value) => value !== ''
              },
              axisLabel: {
                show: true,
                interval: (index, value) => value !== '',
                color: '#333',
                fontSize: epiChartFontSize.value || 15
              },
              splitLine: { show: false },
              data: dateGroups.flatMap(group => {
                const groupData = Array(group.count).fill('');
                if (groupData.length > 0) {
                  groupData[0] = group.name;
                }
                return groupData;
              })
            }
          ]
      ),
      yAxis: { 
        type: 'value', 
        name: '환자 수 (명)',
        nameTextStyle: { padding: [0, 0, 0, 60], fontSize: epiChartFontSize.value || 15 },
        axisLabel: { fontSize: epiChartFontSize.value || 15 },
        splitLine: { show: true, lineStyle: { type: 'dashed' } },
        max: yMax,
        interval: step
      },
      legend: {
        show: isConfirmedCaseColumnVisible.value && showConfirmedCaseLine.value && confirmedCaseSeriesData.length > 0,
        data: ['환자 수', '확진자 수'],
        top: 50,
        right: 20,
        textStyle: { fontSize: epiChartFontSize.value || 15 }
      },
      series: [
        {
          name: '환자 수',
          type: 'bar',
          xAxisIndex: 0, 
          data: seriesData,
          barWidth: '100%',
          itemStyle: {
            color: (() => {
              const colors = generateGradientColors(epiBarColor.value || '#1E88E5');
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors.lightColor }, 
                { offset: 1, color: colors.darkColor }
              ]);
            })()
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#FDB813' }, { offset: 1, color: '#F9A825' }
              ])
            }
          },
          label: { 
            show: true, 
            position: 'top', 
            fontSize: Math.max(10, (epiChartFontSize.value || 15) - 1)
          }
        },
        // 확진자 꺾은선 시리즈 추가
        ...(isConfirmedCaseColumnVisible.value && showConfirmedCaseLine.value && confirmedCaseSeriesData.length > 0 ? [{
          name: '확진자 수',
          type: 'line',
          xAxisIndex: 0,
          data: confirmedCaseSeriesData,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#e74c3c',
            width: 3
          },
          itemStyle: {
            color: '#e74c3c',
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#c0392b',
              borderColor: '#fff',
              borderWidth: 2
            }
          },
          label: {
            show: true,
            position: 'top',
            fontSize: Math.max(10, (epiChartFontSize.value || 15) - 1),
            color: '#e74c3c',
            formatter: (params) => {
              // 막대 그래프와 값이 다른 경우에만 라벨 표시
              const barValue = seriesData[params.dataIndex] || 0;
              const lineValue = params.value || 0;
              return barValue !== lineValue ? lineValue : '';
            }
          }
        }] : [])
      ]
    };
  } catch (error) {
    console.error('generateEpiCurveChartOptions 오류:', error);
    return { title: { text: '차트 생성 오류' } };
  }
};

/**
 * 잠복기 유행곡선 차트 옵션 생성
 * @returns {Object} ECharts 옵션 객체
 */
const generateIncubationChartOptions = () => {
  try {
    const data = incubationPeriodTableData.value;
    if (!Array.isArray(data)) {
      console.error('generateIncubationChartOptions: data가 배열이 아님:', data);
      return { title: { text: '데이터 형식 오류' } };
    }
    const validData = data;
    if (!validData || validData.length === 0) {
      console.warn('generateIncubationChartOptions: 유효한 데이터가 없음');
      return { 
        title: { 
          text: '잠복기 분석 데이터가 필요합니다',
          subtext: '의심원 노출시간과 증상발현시간을 설정하면 잠복기 분석이 시작됩니다',
          left: 'center',
          textStyle: { 
            fontSize: 18, 
            fontFamily: 'Noto Sans KR, sans-serif',
            color: '#666'
          },
          subtextStyle: {
            fontSize: 14,
            color: '#999'
          }
        },
        graphic: {
          type: 'text',
          left: 'center',
          top: '60%',
          style: {
            text: '⏰ 노출시간 설정 → 잠복기 분석',
            fontSize: 16,
            fill: '#1a73e8',
            fontFamily: 'Noto Sans KR, sans-serif'
          }
        }
      };
    }
    const hasValidLabels = validData.every(item => item && typeof item.intervalLabel === 'string');
    if (!hasValidLabels) {
      console.error('generateIncubationChartOptions: 유효하지 않은 라벨 형식');
      return { title: { text: '데이터 라벨 오류' } };
    }
    const seriesData = data.map(item => item.count);
    const maxValue = Math.max(...seriesData);
    const { yMax, step } = getNiceYAxisMaxAndStep(maxValue);
    // 라벨 데이터 분기
    const labelData = validData.map(item => {
      if (incubationChartDisplayMode.value === 'hhmm') {
        return item.intervalLabel;
      } else {
        return formatIncubationLabel(item.intervalLabel);
      }
    });
    return {
      textStyle: {
        fontFamily: 'Noto Sans KR, sans-serif'
      },
      title: {
        text: '잠복기별 환자 수',
        left: 'center',
        textStyle: {
          fontSize: (incubationChartFontSize.value || 15) + 4,
          fontWeight: 'bold'
        },
        top: 15
      },
      // 추정 감염원 풋노트 추가
      ...(suspectedFood.value.trim() && {
        graphic: [{
          type: 'text',
          left: '5%', // 적당한 위치로 조정
          bottom: '8%', // 차트 영역 하단 (간격 조정)
          style: {
            text: `추정 감염원: ${suspectedFood.value}`,
            fontSize: incubationChartFontSize.value || 15,
            fill: '#333',
            fontWeight: 'normal'
          }
        }]
      }),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const param = params[0];
          return `<strong>${param.name}</strong><br/>${param.seriesName}: <strong>${param.value}</strong> 명`;
        }
      },
      grid: {
        left: incubationChartDisplayMode.value === 'hhmm' ? 60 : '3%',
        right: incubationChartDisplayMode.value === 'hhmm' ? 60 : '4%',
        bottom: suspectedFood.value.trim() ? '15%' : '5%', // 추정 감염원이 있으면 하단 여백 증가
        top: 80,
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: labelData,
          axisLine: { show: true, onZero: false },
          axisTick: { show: false },
          axisLabel: {
            rotate: incubationChartDisplayMode.value === 'hhmm' ? 45 : 0,
            interval: 0,
            fontSize: incubationChartFontSize.value || 15,
            color: '#333',
            margin: 10
          },
          splitLine: { show: false },
          boundaryGap: incubationChartDisplayMode.value === 'hhmm' ? [0.18, 0.18] : true
        }
      ],
      yAxis: {
        type: 'value',
        name: '환자 수 (명)',
        nameTextStyle: { padding: [0, 0, 0, 60], fontSize: incubationChartFontSize.value || 15 },
        axisLabel: { fontSize: incubationChartFontSize.value || 15 },
        splitLine: { show: true, lineStyle: { type: 'dashed' } },
        max: yMax,
        interval: step
      },
      series: [
        {
          name: '환자 수',
          type: 'bar',
          data: validData.map((item) => Number(item.count) || 0),
          barWidth: '100%',
          itemStyle: {
            color: (() => {
              const colors = generateGradientColors(incubationBarColor.value || '#1E88E5');
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors.lightColor },
                { offset: 1, color: colors.darkColor }
              ]);
            })()
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#FDB813' },
                { offset: 1, color: '#F9A825' }
              ])
            }
          },
          label: {
            show: true,
            position: 'top',
            fontSize: Math.max(10, (incubationChartFontSize.value || 15) - 1)
          }
        }
      ]
    };
  } catch (error) {
    console.error('generateIncubationChartOptions 오류:', error);
    return { title: { text: '차트 생성 오류' } };
  }
};

// --- Chart Update Logic (성능 최적화) ---

/**
 * 차트 인스턴스들을 강제로 정리
 * @returns {void}
 */
const clearCharts = () => {
  console.log('차트 인스턴스 정리 시작');
  
  if (epiCurveChartInstance.value && typeof epiCurveChartInstance.value.dispose === 'function') {
    try {
      epiCurveChartInstance.value.dispose();
      epiCurveChartInstance.value = null;
      console.log('유행곡선 차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('유행곡선 차트 정리 오류:', error);
    }
  }
  
  if (incubationChartInstance.value && typeof incubationChartInstance.value.dispose === 'function') {
    try {
      incubationChartInstance.value.dispose();
      incubationChartInstance.value = null;
      console.log('잠복기 차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('잠복기 차트 정리 오류:', error);
    }
  }
};

/**
 * 차트 인스턴스들을 업데이트
 * 유행곡선과 잠복기 차트를 모두 업데이트합니다.
 * @returns {void}
 */
const updateCharts = () => {
  try {
    console.log('updateCharts 함수 시작');
    console.log('차트 업데이트 조건 확인:', {
      hasValidData: hasValidData.value,
      hasValidPatientData: hasValidPatientData.value,
      hasValidExposureData: hasValidExposureData.value,
      epiCurveChartContainer: !!epiCurveChartContainer.value,
      incubationChartContainer: !!incubationChartContainer.value
    });
    
    const states = chartStates.value;
    console.log('차트 상태:', states);
    console.log('유행곡선 차트 조건:', {
      container: !!epiCurveChartContainer.value,
      hasValidPatientData: hasValidPatientData.value,
      symptomOnsetTableDataLength: symptomOnsetTableData.value.length
    });
    
    // 유행곡선 차트 업데이트
    if (epiCurveChartContainer.value && hasValidPatientData.value) {
      console.log('유행곡선 차트 업데이트 시작');
      if (!epiCurveChartInstance.value) {
        // DOM 컨테이너 크기 확인
        const container = epiCurveChartContainer.value;
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          epiCurveChartInstance.value = markRaw(
            echarts.init(epiCurveChartContainer.value)
          );
          console.log('유행곡선 차트 인스턴스 생성됨');
          // ReportWriter에서 접근할 수 있도록 전역으로 노출
          exposeChartInstance();
        } else {
          console.warn('유행곡선 차트 컨테이너 크기가 0입니다:', rect);
          return;
        }
      }
      
      const epiOptions = generateEpiCurveChartOptions();
      console.log('유행곡선 차트 옵션 생성됨:', epiOptions ? '성공' : '실패');
      if (epiOptions && typeof epiOptions === 'object') {
        epiCurveChartInstance.value.setOption(epiOptions, true); // notMerge: true로 완전 덮어쓰기
        console.log('유행곡선 차트 업데이트 완료');
        // ReportWriter에서 접근할 수 있도록 전역으로 노출 (업데이트 후)
        exposeChartInstance();
        
        // 차트 인스턴스를 전역에 더 안전하게 저장
        window.currentEpidemicChartInstance = epiCurveChartInstance.value;
        

      } else {
        console.warn('유행곡선 차트 옵션이 유효하지 않음');
      }
    } else {
      console.log('유행곡선 차트 업데이트 건너뜀:', {
        hasContainer: !!epiCurveChartContainer.value,
        hasValidPatientData: hasValidPatientData.value
      });
    }
    
    // 잠복기 차트 업데이트
    if (incubationChartContainer.value && hasValidExposureData.value) {
      if (!incubationChartInstance.value) {
        // DOM 컨테이너 크기 확인
        const container = incubationChartContainer.value;
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          incubationChartInstance.value = markRaw(
            echarts.init(incubationChartContainer.value)
          );
          console.log('잠복기 차트 인스턴스 생성됨');
        } else {
          console.warn('잠복기 차트 컨테이너 크기가 0입니다:', rect);
          return;
        }
      }
      
      const incubationOptions = generateIncubationChartOptions();
      if (incubationOptions && typeof incubationOptions === 'object') {
        incubationChartInstance.value.setOption(incubationOptions, false); // 성능 향상: 병합 방식
        console.log('잠복기 차트 업데이트 완료');
      }
    }
    
    console.log('전체 차트 업데이트 완료');
  } catch (error) {
    console.error('차트 업데이트 중 오류 발생:', error);
    // 에러 발생 시 사용자에게 알림 (선택적)
    // alert(`차트 업데이트 오류: ${error.message}`);
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log('유행곡선 컴포넌트 마운트됨');
  nextTick(updateCharts);
  
  // 컴포넌트 내부에서만 이벤트 처리하도록 수정
  // 전역 이벤트 리스너는 제거하고 컴포넌트 레벨에서 처리
});



// 안전한 차트 업데이트 함수
const safeUpdateCharts = () => {
  try {
    console.log('safeUpdateCharts 호출됨');
    console.log('차트 상태 검증:', {
      hasValidData: hasValidData.value,
      hasValidPatientData: hasValidPatientData.value,
      hasValidExposureData: hasValidExposureData.value,
      isIndividualExposureColumnVisible: isIndividualExposureColumnVisible.value
    });
    
    // 유효한 환자 데이터가 있으면 차트 업데이트 시도
    if (hasValidPatientData.value) {
      console.log('유효한 환자 데이터 확인, 차트 업데이트 시작');
      updateCharts();
    } else {
      console.warn('유효한 환자 데이터가 없어 차트 업데이트 건너뜀');
      clearCharts();
    }
  } catch (error) {
    console.error('차트 업데이트 중 오류:', error);
  }
};

// activated 훅 추가 - 탭 전환 시 안전하게 차트 업데이트
onActivated(() => {
  console.log('유행곡선 탭 활성화됨');
  
  // 상태 동기화 대기
  nextTick(() => {
    // 상세한 데이터 유효성 검증
    console.log('상세 데이터 검증:', {
      hasValidData: hasValidData.value,
      hasValidPatientData: hasValidPatientData.value,
      hasValidExposureData: hasValidExposureData.value,
      isIndividualExposureColumnVisible: isIndividualExposureColumnVisible.value,
      rowsLength: rows.value?.length,
      patientCount: rows.value?.filter(row => row.isPatient === '1').length,
      symptomOnsetCount: rows.value?.filter(row => row.symptomOnset).length
    });
    
    // 유효한 환자 데이터가 있으면 차트 업데이트, 없으면 차트 정리
    if (hasValidPatientData.value) {
      console.log('유효한 환자 데이터 확인됨, 차트 업데이트 시작');
      
      // 개별노출시간열 상태 확인
      if (isIndividualExposureColumnVisible.value) {
        console.log('개별노출시간열 모드로 차트 업데이트');
      } else {
        console.log('공통 노출시간 모드로 차트 업데이트');
      }
      
      // 강제로 차트 업데이트 실행 (조건 검증 없이)
      console.log('강제 차트 업데이트 실행');
      updateCharts();
    } else {
      console.log('유효한 환자 데이터가 없어 차트 정리');
      clearCharts();
    }
  });
});
onUnmounted(() => {
  // 차트 인스턴스 정리
  if (epiCurveChartInstance.value && typeof epiCurveChartInstance.value.dispose === 'function') {
    try {
      epiCurveChartInstance.value.dispose();
      epiCurveChartInstance.value = null;
      console.log('유행곡선 차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('유행곡선 차트 정리 오류:', error);
    }
  }
  
  if (incubationChartInstance.value && typeof incubationChartInstance.value.dispose === 'function') {
    try {
      incubationChartInstance.value.dispose();
      incubationChartInstance.value = null;
      console.log('잠복기 차트 인스턴스 정리 완료');
    } catch (error) {
      console.error('잠복기 차트 정리 오류:', error);
    }
  }
  
  // debounced 함수 취소
  if (debouncedUpdateCharts && typeof debouncedUpdateCharts.cancel === 'function') {
    debouncedUpdateCharts.cancel();
  }
  
  // 참조 정리
  epiCurveChartContainer.value = null;
  incubationChartContainer.value = null;
  
  console.log('EpidemicCurve 컴포넌트 cleanup 완료');
});

// 성능 최적화: debounced 차트 업데이트
const debouncedUpdateCharts = debounce(() => {
  console.log('Debounced chart update triggered');
  safeUpdateCharts();
}, 200);

// --- Watcher (성능 최적화) ---
// 유행곡선 차트 너비 변경 시 차트 재생성
watch(
  epiChartWidth,
  (newWidth, oldWidth) => {
    if (newWidth !== oldWidth && epiCurveChartInstance.value) {
      console.log(`Epi chart width changed: ${oldWidth} -> ${newWidth}. Recreating epi chart.`);
      
      // 유행곡선 차트 인스턴스 dispose하고 재생성
      if (epiCurveChartInstance.value && typeof epiCurveChartInstance.value.dispose === 'function') {
        try {
          epiCurveChartInstance.value.dispose();
          epiCurveChartInstance.value = null;
        } catch (e) {
          console.error('Error disposing epi curve chart:', e);
        }
      }
      
      // DOM 업데이트 후 차트 재생성
      nextTick(() => {
        setTimeout(() => {
          if (epiCurveChartContainer.value) {
            try {
              epiCurveChartInstance.value = markRaw(echarts.init(epiCurveChartContainer.value));
              safeUpdateCharts();
            } catch (error) {
              console.error('EpiCurve chart recreation failed:', error);
            }
          }
        }, 50); // DOM 렌더링을 위한 짧은 지연
      });
    }
  },
  { flush: 'post' } // DOM 업데이트 후 실행
);

// 잠복기 차트 너비 변경 시 차트 재생성
watch(
  incubationChartWidth,
  (newWidth, oldWidth) => {
    if (newWidth !== oldWidth && incubationChartInstance.value) {
      console.log(`Incubation chart width changed: ${oldWidth} -> ${newWidth}. Recreating incubation chart.`);
      
      // 잠복기 차트 인스턴스 dispose하고 재생성
      if (incubationChartInstance.value && typeof incubationChartInstance.value.dispose === 'function') {
        try {
          incubationChartInstance.value.dispose();
          incubationChartInstance.value = null;
        } catch (e) {
          console.error('Error disposing incubation chart:', e);
        }
      }
      
      // DOM 업데이트 후 차트 재생성
      nextTick(() => {
        setTimeout(() => {
          if (incubationChartContainer.value) {
            try {
              incubationChartInstance.value = markRaw(echarts.init(incubationChartContainer.value));
              safeUpdateCharts();
            } catch (error) {
              console.error('Incubation chart recreation failed:', error);
            }
          }
        }, 50); // DOM 렌더링을 위한 짧은 지연
      });
    }
  },
  { flush: 'post' } // DOM 업데이트 후 실행
);

// 유행곡선 차트 시간 간격 변경 시 자동 너비 조정
watch(
  selectedSymptomInterval,
  (newInterval) => {
    if (newInterval === 3) {
      epiChartWidth.value = 1100;
      epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
      console.log('유행곡선 차트: 3시간 간격 설정으로 너비를 1100px로 자동 조정');
    }
  },
  { immediate: false }
);

// 잠복기 차트 시간 간격 변경 시 자동 너비 조정
watch(
  selectedIncubationInterval,
  (newInterval) => {
    if (newInterval === 3) {
      incubationChartWidth.value = 1100;
      incubationChartWidthButtonText.value = `${incubationChartWidth.value}px`;
      console.log('잠복기 차트: 3시간 간격 설정으로 너비를 1100px로 자동 조정');
    }
  },
  { immediate: false }
);

// 다른 속성 변경 시 차트 업데이트 (rows 제거)
watch(
  [
    selectedSymptomInterval,
    exposureDateTime,
    selectedIncubationInterval,
    epiBarColor,
    epiChartFontSize,
    incubationBarColor,
    incubationChartFontSize,
    chartDisplayMode,
    incubationChartDisplayMode,
    showConfirmedCaseLine,
    suspectedFood
  ],
  ([newSymptomInterval, newExposureDateTime, newIncubationInterval, newEpiBarColor, newEpiFontSize, newIncubationBarColor, newIncubationFontSize, newDisplayMode, newIncubationDisplayMode, newShowConfirmedCaseLine, newSuspectedFood],
    [oldSymptomInterval, oldExposureDateTime, oldIncubationInterval, oldEpiBarColor, oldEpiFontSize, oldIncubationBarColor, oldIncubationFontSize, oldDisplayMode, oldIncubationDisplayMode, oldShowConfirmedCaseLine, oldSuspectedFood]) => {
    
    // 실제 변경사항 확인 (불필요한 업데이트 방지)
    const hasSymptomChange = newSymptomInterval !== oldSymptomInterval;
    const hasExposureChange = newExposureDateTime !== oldExposureDateTime;
    const hasIncubationChange = newIncubationInterval !== oldIncubationInterval;
    const hasEpiStyleChange = newEpiBarColor !== oldEpiBarColor || newEpiFontSize !== oldEpiFontSize;
    const hasIncubationStyleChange = newIncubationBarColor !== oldIncubationBarColor || newIncubationFontSize !== oldIncubationFontSize;
    const hasDisplayModeChange = newDisplayMode !== oldDisplayMode;
    const hasIncubationDisplayModeChange = newIncubationDisplayMode !== oldIncubationDisplayMode;
    const hasConfirmedCaseLineChange = newShowConfirmedCaseLine !== oldShowConfirmedCaseLine;
    const hasSuspectedFoodChange = newSuspectedFood !== oldSuspectedFood;
    
    if (!hasSymptomChange && !hasExposureChange && !hasIncubationChange && !hasEpiStyleChange && !hasIncubationStyleChange && !hasDisplayModeChange && !hasIncubationDisplayModeChange && !hasConfirmedCaseLineChange && !hasSuspectedFoodChange) {
      return; // 변경사항 없으면 조기 종료
    }
    
    console.log('Chart update triggered with changes:', {
      hasSymptomChange, hasExposureChange, hasIncubationChange, hasEpiStyleChange, hasIncubationStyleChange, hasDisplayModeChange, hasIncubationDisplayModeChange, hasConfirmedCaseLineChange, hasSuspectedFoodChange
    });
    
    nextTick(() => {
      debouncedUpdateCharts();
    });
  },
  { 
    deep: false, 
    immediate: false,
    flush: 'post' // DOM 업데이트 후 실행
  }
);

// 기존 store의 rows 감시 - Excel 데이터 가져오기 및 초기화 시 즉시 반응
watch(
  () => store.getters.rows,
  (newRows, oldRows) => {
    if (newRows !== oldRows) {
      console.log('Store rows changed, updating epidemic curve charts');
      console.log('Store rows change detected:', {
        newRowsLength: newRows?.length || 0,
        oldRowsLength: oldRows?.length || 0,
        hasValidData: hasValidData.value,
        hasValidPatientData: hasValidPatientData.value
      });
      
      nextTick(() => {
        // 유효한 환자 데이터가 없으면 차트 정리
        if (!hasValidPatientData.value) {
          console.log('유효한 환자 데이터 없음, 차트 정리');
          clearCharts();
        } else {
          console.log('유효한 환자 데이터 있음, 차트 업데이트');
          safeUpdateCharts();
        }
      });
    }
  },
  { deep: true, immediate: false }
);

// 확진자 데이터 변경 감시
watch(
  () => confirmedCaseOnsetTableData.value,
  (newData, oldData) => {
    if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
      console.log('확진자 데이터 변경됨, 차트 업데이트');
      nextTick(() => {
        if (hasValidPatientData.value) {
          safeUpdateCharts();
        }
      });
    }
  },
  { deep: true, immediate: false }
);

// StoreBridge resetSheet 액션과 연동하여 차트 정리
watch(
  () => hasValidPatientData.value,
  (hasValidData, hadValidData) => {
    if (!hasValidData && hadValidData) {
      console.log('유효한 환자 데이터가 사라짐, 차트 정리');
      clearCharts();
    } else if (hasValidData && !hadValidData) {
      console.log('유효한 환자 데이터가 추가됨, 차트 업데이트');
      nextTick(() => {
        safeUpdateCharts();
      });
    }
  }
);

// DateTimePicker 관련 메서드들
const showExposureDateTimePicker = () => {
  // 현재 설정된 값이 있으면 파싱, 없으면 현재 시간
  let initialValue;
  if (exposureDateTime.value) {
    try {
      const date = new Date(exposureDateTime.value);
      if (!isNaN(date.getTime())) {
        initialValue = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: String(date.getHours()).padStart(2, '0'),
          minute: String(date.getMinutes()).padStart(2, '0')
        };
      }
    } catch (error) {
      console.error('기존 노출시간 파싱 오류:', error);
    }
  }
  
  if (!initialValue) {
    // 현재 시간으로 초기화
    const now = new Date();
    initialValue = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: String(now.getHours()).padStart(2, '0'),
      minute: String(now.getMinutes()).padStart(2, '0')
    };
  }
  
  // input 위치 계산
  const input = document.querySelector('#exposure-time');
  if (input) {
    const rect = input.getBoundingClientRect();
    exposureDateTimePickerState.value.position = {
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX
    };
  }
  
  exposureDateTimePickerState.value.initialValue = initialValue;
  exposureDateTimePickerState.value.visible = true;
};

const onExposureDateTimeConfirm = (dateTimeObject) => {
  try {
    const { year, month, day, hour, minute } = dateTimeObject;
    const formattedDateTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hour}:${minute}`;
    exposureDateTime.value = formattedDateTime;
    console.log('노출시간 설정 완료:', formattedDateTime);
  } catch (error) {
    console.error('노출시간 설정 오류:', error);
  }
  
  exposureDateTimePickerState.value.visible = false;
};

const onExposureDateTimeCancel = () => {
  exposureDateTimePickerState.value.visible = false;
};

// 추정 감염원 변경 핸들러
const onSuspectedFoodChange = () => {
  // 차트 업데이트 트리거
  nextTick(() => {
    if (hasValidPatientData.value) {
      safeUpdateCharts();
    }
  });
};

// 추정 감염원 변경 시 차트 업데이트
watch(suspectedFood, () => {
  nextTick(() => {
    if (hasValidPatientData.value) {
      safeUpdateCharts();
    }
  });
  
  // Vuex에도 저장하여 보고서 탭에서 사용
  store.commit('SET_SELECTED_SUSPECTED_FOODS', suspectedFood.value);
});

// 백그라운드 분석 결과 변화 감지
watch(() => store.getters.analysisResults, (newResults) => {
  if (newResults && (newResults.caseControl?.length > 0 || newResults.cohort?.length > 0)) {
    console.log('백그라운드 분석 결과 감지:', newResults);
  }
}, { deep: true });

// 분석 상태 변화 감지
watch(analysisStatus, (newStatus) => {
  if (newStatus) {
    console.log('분석 상태 업데이트:', newStatus.message);
  }
}, { deep: true });

// 커스텀 드롭다운 토글
const toggleDropdown = () => {
  if (hasAnalysisResults.value) {
    isDropdownOpen.value = !isDropdownOpen.value;
    
    // 드롭다운이 열릴 때 현재 입력된 추정 감염원들을 체크박스에 반영
    if (isDropdownOpen.value) {
      const currentFoods = suspectedFood.value.split(',').map(f => f.trim()).filter(f => f);
      selectedFoods.value = new Set(currentFoods);
    }
  }
};

// 체크박스로 추정 감염원 선택/해제
const toggleFoodSelection = (foodItem) => {
  if (selectedFoods.value.has(foodItem)) {
    selectedFoods.value.delete(foodItem);
  } else {
    selectedFoods.value.add(foodItem);
  }
  
  // 즉시 입력란에 반영
  const selectedArray = Array.from(selectedFoods.value);
  suspectedFood.value = selectedArray.join(', ');
  
  // 차트 업데이트 트리거
  nextTick(() => {
    if (hasValidPatientData.value) {
      safeUpdateCharts();
    }
  });
};

// 추정 감염원이 선택되었는지 확인
const isFoodSelected = (foodItem) => {
  return selectedFoods.value.has(foodItem);
};

// 선택된 추정 감염원들을 입력란에 적용 (드롭다운 닫기)
const applySelectedFoods = () => {
  isDropdownOpen.value = false;
};

// 드롭다운 외부 클릭 시 닫기
const closeDropdown = () => {
  isDropdownOpen.value = false;
};

// 컴포넌트 마운트 시 외부 클릭 이벤트 리스너 추가
onMounted(() => {
  document.addEventListener('click', (event) => {
    const dropdown = document.querySelector('.unified-food-selector');
    if (dropdown && !dropdown.contains(event.target)) {
      closeDropdown();
    }
  });
});



// 잠복기 차트 내보내기 함수 추가
const exportIncubationChart = async () => {
  const instance = incubationChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('차트 내보내기 불가');
    return;
  }
  const filename = `잠복기_유행곡선_${selectedIncubationInterval.value}시간_${new Date().toISOString().split('T')[0]}.png`;
  
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${incubationChartWidth.value}px`;
    tempContainer.style.height = '600px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    const tempChart = echarts.init(tempContainer);
    const currentOption = instance.getOption();
    currentOption.animation = false;
    tempChart.setOption(currentOption, true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const dataUrl = tempChart.getDataURL({
      type: 'png',
      pixelRatio: 3,
      backgroundColor: '#fff'
    });
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('유효하지 않은 이미지 데이터 URL');
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    tempChart.dispose();
    document.body.removeChild(tempContainer);
    console.log('잠복기 차트 저장 완료:', filename);
  } catch (error) {
    const message = `차트 내보내기 오류: ${error.message}`;
    console.error(message);
    alert(message);
  }
};



// 시간 간격 변경 시 차트 설정에 저장
watch(selectedSymptomInterval, (newValue) => {
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { timeInterval: newValue });
});

// store 설정 변경 시 로컬 상태 동기화
watch(chartSettings, (newSettings) => {
  if (newSettings.fontSize !== epiChartFontSize.value) {
    epiChartFontSize.value = newSettings.fontSize || 15;
    epiFontSizeButtonText.value = fontSizeLabels[fontSizes.indexOf(epiChartFontSize.value)] || '작게';
  }
  if (newSettings.chartWidth !== epiChartWidth.value) {
    epiChartWidth.value = newSettings.chartWidth || 1100;
    epiChartWidthButtonText.value = `${epiChartWidth.value}px`;
  }
  if (newSettings.barColor !== epiBarColor.value) {
    epiBarColor.value = newSettings.barColor || '#1E88E5';
  }
  if (newSettings.displayMode !== chartDisplayMode.value) {
    chartDisplayMode.value = newSettings.displayMode || 'time';
  }
}, { deep: true });

// --- 보고서 저장 상태 관리 ---
const isChartSaved = ref(false);
const showChartSavedTooltip = ref(false);
// 저장 버튼 강조 상태 (보더 샤인 사용) - 별도 상태 변수 불필요

// 차트 옵션이 바뀌면 저장되지 않은 상태로 표시
watch([
  epiChartFontSize,
  epiChartWidth,
  epiBarColor,
  chartDisplayMode,
  selectedSymptomInterval,
  showConfirmedCaseLine
], () => {
  isChartSaved.value = false;
  // 옵션 변경 시 블링크 스케줄 재개
  if (!isChartSaved.value) scheduleBlink('epi');
});

// 저장 버튼으로 보고서용 차트 이미지를 Vuex에 저장
const saveChartForReport = async () => {
  const instance = epiCurveChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('차트를 먼저 생성한 뒤에 저장해주세요.');
    return;
  }

  try {
    // 차트가 완전히 렌더링될 때까지 대기
    // ECharts의 finishLoading 이벤트를 기다리거나 최소 1초 대기
    await new Promise(resolve => {
      if (instance.isLoading && instance.isLoading()) {
        // 차트가 로딩 중이면 finishLoading 이벤트를 기다림
        instance.on('finishLoading', () => {
          setTimeout(resolve, 200); // 추가 안정성을 위한 200ms 대기
        });
      } else {
        // 이미 로딩이 완료되었으면 1초 대기
        setTimeout(resolve, 1000);
      }
    });
    
    const dataUrl = instance.getDataURL({
      type: 'bmp',
      pixelRatio: 3,
      backgroundColor: '#ffffff'
    });

    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { 
        reportChartDataUrl: dataUrl,
        reportChartWidth: epiChartWidth.value * 3  // 3배 픽셀로 생성되므로 실제 크기도 3배
      });
      window.currentEpidemicChartInstance = instance; // 최신 인스턴스 보존 (선택)
      isChartSaved.value = true;
      showChartSavedTooltip.value = true;
      
      // 저장 완료 툴팁을 1.5초 후에 자동으로 숨김
      setTimeout(() => {
        showChartSavedTooltip.value = false;
      }, 1500);
      
      console.log('보고서용 차트 이미지가 저장되었습니다!');
    } else {
      throw new Error('이미지 데이터가 유효하지 않습니다.');
    }
  } catch (error) {
    console.error('차트 이미지 저장 실패:', error);
    alert(`차트 이미지 저장 실패: ${error.message}`);
  }
};

// 잠복기 차트 보고서 저장 상태 관리
const isIncubationChartSaved = ref(false);
const showIncubationChartSavedTooltip = ref(false);
// 잠복기 저장 버튼 강조 상태 (보더 샤인 사용) - 별도 상태 변수 불필요

// 잠복기 차트 옵션 변경 시 저장되지 않은 상태로 표시
watch([
  incubationChartFontSize,
  incubationChartWidth,
  incubationBarColor,
  incubationChartDisplayMode,
  selectedIncubationInterval
], () => {
  isIncubationChartSaved.value = false;
  if (!isIncubationChartSaved.value) scheduleBlink('incubation');
}, { deep: false, immediate: false });

// 잠복기 차트 저장 버튼 (보고서용)
const saveIncubationChartForReport = async () => {
  const instance = incubationChartInstance.value;
  if (!instance || typeof instance.getDataURL !== 'function') {
    alert('잠복기 차트를 먼저 생성한 뒤에 저장해주세요.');
    return;
  }

  try {
    // 차트가 완전히 렌더링될 때까지 대기
    // ECharts의 finishLoading 이벤트를 기다리거나 최소 1초 대기
    await new Promise(resolve => {
      if (instance.isLoading && instance.isLoading()) {
        // 차트가 로딩 중이면 finishLoading 이벤트를 기다림
        instance.on('finishLoading', () => {
          setTimeout(resolve, 200); // 추가 안정성을 위한 200ms 대기
        });
      } else {
        // 이미 로딩이 완료되었으면 1초 대기
        setTimeout(resolve, 1000);
      }
    });
    
    const dataUrl = instance.getDataURL({
      type: 'bmp',
      pixelRatio: 3,
      backgroundColor: '#ffffff'
    });

    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', { 
        reportIncubationChartDataUrl: dataUrl,
        reportIncubationChartWidth: incubationChartWidth.value * 3  // 3배 픽셀로 생성되므로 실제 크기도 3배
      });
      isIncubationChartSaved.value = true;
      showIncubationChartSavedTooltip.value = true;
      
      // 저장 완료 툴팁을 1.5초 후에 자동으로 숨김
      setTimeout(() => {
        showIncubationChartSavedTooltip.value = false;
      }, 1500);
      
      console.log('잠복기 차트 이미지가 보고서용으로 저장되었습니다!');
    } else {
      throw new Error('이미지 데이터가 유효하지 않습니다.');
    }
  } catch (error) {
    console.error('잠복기 차트 이미지 저장 실패:', error);
    alert(`잠복기 차트 이미지 저장 실패: ${error.message}`);
  }
};

// 차트 설정 초기화 함수들
// 유행곡선 차트 설정 초기화
const resetEpiChartSettings = () => {
  // 기본값으로 초기화
  epiChartFontSize.value = 18; // 15 → 18
  epiChartWidth.value = 1100;
  epiBarColor.value = '#1E88E5';
  chartDisplayMode.value = 'time';
  showConfirmedCaseLine.value = true;
  
  // 버튼 텍스트 업데이트
  epiFontSizeButtonText.value = '보통';
  epiChartWidthButtonText.value = '1100px';
  
  // Vuex store 업데이트
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', {
    fontSize: 18, // 15 → 18
    chartWidth: 1100,
    barColor: '#1E88E5',
    displayMode: 'time'
  });
  
  // 저장 상태 초기화
  isChartSaved.value = false;
  
  // 차트 업데이트
  nextTick(() => {
    safeUpdateCharts();
  });
  
  console.log('유행곡선 차트 설정이 기본값으로 초기화되었습니다.');
};

// 잠복기 차트 설정 초기화
const resetIncubationChartSettings = () => {
  // 기본값으로 초기화
  incubationChartFontSize.value = 18; // 15 → 18
  incubationChartWidth.value = 1100;
  incubationBarColor.value = '#91cc75';
  incubationChartDisplayMode.value = 'hour';
  
  // 버튼 텍스트 업데이트
  incubationFontSizeButtonText.value = '보통';
  incubationChartWidthButtonText.value = '1100px';
  
  // Vuex store 업데이트
  store.commit('UPDATE_EPIDEMIC_CURVE_SETTINGS', {
    incubationFontSize: 18, // 15 → 18
    incubationChartWidth: 1100,
    incubationBarColor: '#91cc75',
    incubationDisplayMode: 'hour'
  });
  
  // 저장 상태 초기화
  isIncubationChartSaved.value = false;
  
  // 차트 업데이트
  nextTick(() => {
    safeUpdateCharts();
  });
  
  console.log('잠복기 차트 설정이 기본값으로 초기화되었습니다.');
};

// --- Border Shine Sweep (no layout shift) ---
// 스케줄: 진입 즉시 1회 + 이후 22–24초 간격 1–2회. 사용자 상호작용 시 중단.
const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BLINK_DURATION_MS = 3500;

function triggerBlink(kind) {
  if (prefersReducedMotion) return;
  const selector = kind === 'epi'
    ? '.epi-chart-wrapper .export-chart-button.shadow-blink'
    : '.incubation-chart-wrapper .export-chart-button.shadow-blink';
  const done = kind === 'epi' ? isChartSaved.value : isIncubationChartSaved.value;
  if (done) return;
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.add('blink-active');
    setTimeout(() => btn.classList.remove('blink-active'), BLINK_DURATION_MS);
  });
}

function scheduleBlink(kind) {
  if (prefersReducedMotion) return;
  const stateKey = kind === 'epi' ? 'epiBlink' : 'incBlink';
  if (!scheduleBlink._state) scheduleBlink._state = { epiBlink: { timer: null }, incBlink: { timer: null } };
  const s = scheduleBlink._state[stateKey];
  if (s.timer) clearInterval(s.timer);
  // 저장 완료 여부와 무관하게, '보고서 저장' 버튼일 때는 항상 깜박
  // 반복적으로 은은히 깜박 (3초 주기)
  s.timer = setInterval(() => {
    triggerBlink(kind);
  }, 4000);
}

onMounted(() => {
  // 탭 진입 즉시 첫 깜박 + 주기 시작
  triggerBlink('epi');
  triggerBlink('incubation');
  scheduleBlink('epi');
  scheduleBlink('incubation');
});

onUnmounted(() => {
  if (scheduleBlink._state?.epiBlink?.timer) clearTimeout(scheduleBlink._state.epiBlink.timer);
  if (scheduleBlink._state?.incBlink?.timer) clearTimeout(scheduleBlink._state.incBlink.timer);
});

function onEpiSaveMouseEnter() { showTooltip('saveEpiReport', '보고서 작성 탭에 차트를 넣으려면 저장을 눌러주세요. 현재 스타일 그대로 저장됩니다.'); }
function onEpiSaveMouseLeave() { hideTooltip(); }
function onEpiSaveInteract() { if (scheduleBlink._state?.epiBlink?.timer) clearTimeout(scheduleBlink._state.epiBlink.timer); }
function onIncubationSaveMouseEnter() { showTooltip('saveIncubationReport', '보고서 작성 탭에 차트를 넣으려면 저장을 눌러주세요. 현재 스타일 그대로 저장됩니다.'); }
function onIncubationSaveMouseLeave() { hideTooltip(); }
function onIncubationSaveInteract() { if (scheduleBlink._state?.incBlink?.timer) clearTimeout(scheduleBlink._state.incBlink.timer); }

watch(isChartSaved, (v) => { if (v && scheduleBlink._state?.epiBlink?.timer) clearTimeout(scheduleBlink._state.epiBlink.timer); });
watch(isIncubationChartSaved, (v) => { if (v && scheduleBlink._state?.incBlink?.timer) clearTimeout(scheduleBlink._state.incBlink.timer); });

</script>

<style scoped>
/* ... (기본 스타일 및 컨트롤 영역 등 변경 없음) ... */

/* --- 기본 앱 및 대시보드 스타일 --- */
.app {
  background-color: #f0f0f0;
  min-height: 100vh;
}
.dashboard {
  display: flex;
  flex-direction: column;
  width: 97%;
  margin: 20px auto;
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
.summary-bar {
  height: 40px;
  display: flex;
  align-items: center;
  font-size: 20px;
  color: white;
  background-color: #1a73e8;
  padding: 5px;
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 300;
}
.summary-bar__title {
  display: flex;
  align-items: center;
  margin-left: 3px;
}
.summary-bar__logo {
  margin-right: 5px;
  width: 35px;
  height: auto;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
}

/* --- 입력 컨트롤 영역 스타일 (PatientCharacteristics UI container 스타일 적용) --- */
.controls-area {
  padding: 10px 15px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  box-sizing: border-box;
  width: 100%;
  justify-content: flex-start;
  margin-bottom: 18px;
}

/* --- 컨트롤 그룹 스타일 --- */
.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative; /* z-index 컨텍스트 제공 */
}

.control-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  font-weight: 500;
}

.control-select {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  min-width: 85px;
  background-color: #fff;
  color: #333;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px;
  padding-right: 28px;
}

.control-select:hover {
  border-color: #1a73e8;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
}

.control-select:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.control-select option {
  padding: 8px 12px;
  font-size: 13px;
  background-color: #fff;
  color: #333;
}

.control-button {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f8f9fa;
  color: #333;
  cursor: pointer;
  font-size: 13px;
  font-family: "Roboto", sans-serif;
  min-width: 45px;
  height: 28px;
  line-height: 18px;
  text-align: center;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  white-space: nowrap;
}

.control-button:not(.color-button):hover {
  background-color: #1a73e8;
  color: white;
  border-color: #1a73e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.control-button:active {
  background-color: #e9ecef;
  color: #333;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.font-button {
  min-width: 35px;
}

.width-button {
  min-width: 35px;
}

.color-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #dadce0;
  padding: 0;
  background: none;
  margin-left: 2px;
  margin-right: 2px;
  cursor: pointer;
  display: inline-block;
  box-shadow: none;
  min-width: unset;
  line-height: 32px;
}

.color-button:hover {
  border-color: #4285f4;
  opacity: 0.85;
  transform: scale(1.05);
}

.reset-button-group {
  margin-left: auto;
  margin-right: 0;
}

.reset-text-button {
  min-width: 60px;
  height: 28px;
  border-radius: 5px;
  border: 1px solid #ccc;
  padding: 4px 8px;
  background-color: #f8f9fa;
  color: #666;
  cursor: pointer;
  font-size: 13px;
  font-family: "Noto Sans KR", sans-serif;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.reset-text-button:hover {
  border-color: #1a73e8;
  background-color: #1a73e8;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}



.control-input-datetime {
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  width: 160px;
  background-color: #fff;
  color: #333;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  height: 32px;
  box-sizing: border-box;
  text-align: center;
}

.control-input-datetime:hover {
  border-color: #1a73e8;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
}

.control-input-datetime:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

/* --- 요약 정보 아이템 스타일 (텍스트 기반) --- */
.info-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
  align-items: center;
}
.info-label {
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  padding-left: 10px;
}
.info-value {
  color: #333;
  font-weight: bold;
}

/* --- 테이블/차트 출력 영역 스타일 --- */
.output-area {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 20px 30px 30px 30px;
}

/* --- 각 테이블-차트 쌍을 담는 Row 스타일 --- */
.output-row {
  display: flex;
  gap: 30px;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 700px;
}
.analysis-table-container,
.controls-and-chart-wrapper {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* --- 테이블 컨테이너 스타일 --- */
.table-container {
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow-x: auto;
  flex: 0 0 325px;
  min-width: 325px;
  max-width: 325px;
  height: 700px; /* 고정 높이로 변경 */
}

/* --- 테이블 내 요약 정보 스타일 (공통, 텍스트 기반) --- */
.summary-info-embedded,
.incubation-summary-info-embedded {
  margin: 0 20px 20px 20px; /* 상단 마진 제거, 좌우/하단 여백 */
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* --- 테이블 제목 스타일 (공통) --- */
.table-title {
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
  text-align: left;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 20px 20px 10px 20px; /* 기본 마진 */
}
/* 테이블 컨테이너 내 첫번째 제목 마진 유지 */
.table-container > .table-title:first-of-type {
   margin: 20px 20px 10px 20px;
}
/* 하단 요약 정보 제목 마진 */
.symptom-summary-title,
.incubation-summary-title {
    /* 테이블과의 상단 간격 줄임 */
    margin: 10px 20px 10px 20px;
}

.selected-variable-details__title-dot {
  display: inline-block;
  width: 0.4em;
  height: 0.4em;
  background-color: #1a73e8;
  margin-right: 0.4em;
  vertical-align: middle;
  border-radius: 50%;
}

/* --- 빈도 테이블 스타일 --- */
.frequency-table {
  width: auto;
  font-size: 14px;
  border-collapse: collapse;
  /* 테이블과 아래 요약 제목 사이 간격 조절 위해 하단 마진 유지 */
  margin: 0px 20px 0px 20px;
}
.frequency-table thead th {
  background-color: #f2f2f2;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
}
.frequency-table th,
.frequency-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: center;
  white-space: nowrap;
}
.frequency-table tbody td:first-child {
  text-align: left;
}

.no-data-message {
  padding: 20px;
  text-align: center;
  color: #888;
  margin: 20px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-message-default {
  color: #666;
  font-size: 16px;
}

/* 입력 가이드 메시지 */
.input-guide-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  border: 2px dashed #4a90e2;
  border-radius: 12px;
  color: #2c5282;
  width: 100%;
  box-sizing: border-box;
}

.guide-icon {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.guide-text {
  text-align: left;
}

.guide-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c5282;
  margin-bottom: 4px;
}

.guide-subtitle {
  font-size: 14px;
  color: #4a90e2;
  line-height: 1.4;
}

/* --- 컨트롤 + 차트 래퍼 공통 스타일 --- */
.controls-and-chart-wrapper {
  flex: 1 1 0;
  min-width: 0;
  overflow: visible; /* hidden에서 visible로 변경하여 툴팁이 잘리지 않도록 함 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* --- 차트 컨테이너 스타일 --- */
.chart-container-wrapper {
  flex: 1 1 0;
  min-width: 0;
  overflow: visible;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 12px 20px 20px 20px; /* 상단만 8px로 줄임 */
  position: relative;
  width: 100%;
  margin: 0;
  flex: 1;
}

/* --- 차트 버튼 스타일 --- */
.chart-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

/* --- 차트 인스턴스 스타일 --- */
.chart-instance {
  height: 550px;
  min-height: 550px;
  max-height: 550px;
  margin: auto;
}

.export-chart-button,
.copy-chart-button {
  padding: 6px 10px;
  border: none;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #1a73e8;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.export-chart-button:hover,
.copy-chart-button:hover {
  background-color: rgba(26, 115, 232, 0.1);
}

.export-chart-button:active,
.copy-chart-button:active {
  background-color: rgba(26, 115, 232, 0.2);
}

/* --- Shadow Blink (soft glow pulse, no layout shift) --- */
.export-chart-button.shadow-blink { position: relative; z-index: 0; }
.export-chart-button.shadow-blink::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  pointer-events: none;
  box-shadow: 0 0 0 0 rgba(26,115,232,0.0), 0 0 0 rgba(26,115,232,0.0);
  opacity: 0;
}
.export-chart-button.shadow-blink.blink-active::after { animation: shadow-blink-key 3500ms ease-in-out 1; }
@keyframes shadow-blink-key {
  0% { opacity: 0; box-shadow: 0 0 0 0 rgba(26,115,232,0.00), 0 0 0 rgba(26,115,232,0.00); }
  50% { opacity: 1; box-shadow: 0 2px 10px 0 rgba(26,115,232,0.55), 0 0 16px rgba(26,115,232,0.45); }
  100% { opacity: 0; box-shadow: 0 0 0 0 rgba(26,115,232,0.00), 0 0 0 rgba(26,115,232,0.00); }
}
@media (prefers-reduced-motion: reduce) {
  .export-chart-button.shadow-blink.blink-active::after { animation: none; opacity: 1; box-shadow: 0 0 0 0 rgba(26,115,232,0.0), 0 0 12px rgba(26,115,232,0.25); }
}

.button-icon {
  display: flex;
  align-items: center;
}

.button-text {
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
}

/* --- 반응형 스타일 --- */
@media (max-width: 1100px) {
  .controls-area {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    justify-content: space-between;
  }
  
  .chart-container-wrapper {
    padding: 15px;
  }

  .button-text {
    display: none;
  }

  .export-chart-button,
  .copy-chart-button {
    padding: 6px;
  }
}



/* --- 복사 툴크 스타일 --- */
.copy-tooltip {
  position: absolute;
  left: 50%;
  top: 110%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  animation: fadeInOut 1.5s;
}
.copy-tooltip.check-tooltip {
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.copy-tooltip.check-tooltip svg {
  display: block;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 0.95; }
  90% { opacity: 0.95; }
  100% { opacity: 0; }
}

.control-button-wrapper {
  position: relative;
  display: inline-block;
  /* z-index: 20; 제거 */
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
  z-index: 1050; /* z-index 값 증가 */
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

.control-button.active {
  background-color: #1a73e8;
  color: white;
  border-color: #1a73e8;
  font-weight: 500;
}

/* --- 차트 표시 모드 버튼 스타일 --- */
.chart-select-button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 14px;
  background-color: white;
  cursor: pointer;
  font-family: "Noto Sans KR", sans-serif;
  font-size: 13px;
  transition: all 0.2s ease;
}

.chart-select-button:hover {
  background-color: #f0f0f0;
  border-color: #aaa;
}

.chart-select-button--active {
  background-color: #1a73e8;
  color: white;
  border-color: #1a73e8;
  font-weight: 500;
}

.chart-select-button--active:hover {
  background-color: #155ab6;
}

.button-group-toggle {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 5px;
  overflow: hidden;
}

.button-group-toggle .control-button {
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-left: 1px solid #ccc;
}

.button-group-toggle .control-button:first-child {
  border-left: none;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 4;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 300;
  font-family: "Noto Sans KR", sans-serif;
  color: #202124;
}

/* --- 추정 감염원 입력 필드 스타일 --- */
.suspected-food-input-container {
  padding: 20px 20px 10px 20px;
  background-color: #fff;
  border-radius: 12px 12px 0 0;
}

.suspected-food-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suspected-food-dropdown-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}

.suspected-food-dropdown-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}

.suspected-food-dropdown {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: "Noto Sans KR", sans-serif;
  background-color: #fff;
  color: #333;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.suspected-food-dropdown:hover:not(:disabled) {
  border-color: #1a73e8;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
}

.suspected-food-dropdown:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

/* 통합된 드롭다운과 입력란 스타일 */
.unified-food-selector {
  position: relative;
  width: 100%;
}

.input-dropdown-trigger {
  position: relative;
  display: flex;
  align-items: center;
}

.unified-food-input {
  width: 100%;
  padding: 8px 12px;
  padding-right: 30px; /* 화살표 공간 확보 */
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: "Noto Sans KR", sans-serif;
  background-color: #fff;
  color: #333;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.unified-food-input:hover:not(:disabled) {
  border-color: #1a73e8;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
}

.unified-food-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.unified-food-input:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.dropdown-arrow {
  position: absolute;
  right: 8px;
  font-size: 12px;
  color: #666;
  transition: transform 0.2s ease;
  pointer-events: none;
}

.dropdown-open .dropdown-arrow {
  transform: rotate(180deg);
}

.checkbox-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-header {
  padding: 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.checkbox-dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  gap: 8px;
}

.checkbox-dropdown-item:hover {
  background-color: #f8f9fa;
}

.food-checkbox {
  margin: 0;
  cursor: pointer;
}

.food-name {
  flex: 1;
  font-size: 13px;
  color: #333;
  text-align: left;
}

.food-pvalue {
  font-size: 12px;
  color: #666;
  text-align: right;
  font-weight: 500;
  min-width: 60px;
}

.food-stat {
  font-size: 12px;
  color: #1a73e8;
  text-align: right;
  font-weight: 600;
  min-width: 80px;
}

.food-or {
  font-size: 11px;
  color: #888;
  margin-left: 4px;
  font-weight: 400;
}

.analysis-status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
  margin-left: 8px;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: help;
}

.analysis-status-badge.success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border-color: #4caf50;
}

.analysis-status-badge.warning {
  background-color: #fff3cd;
  color: #856404;
  border-color: #ffc107;
}

.analysis-status-badge.error {
  background-color: #ffebee;
  color: #c62828;
  border-color: #f44336;
}

.analysis-status-wrapper {
  position: relative;
  display: inline-block;
  overflow: visible;
}

.analysis-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 12px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-family: "Noto Sans KR", sans-serif;
  font-weight: 400;
  min-width: 280px;
  max-width: 400px;
  white-space: normal;
  text-align: center;
  line-height: 1.4;
}

.analysis-tooltip::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid #e0e0e0;
}

.analysis-tooltip::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid white;
}



.dropdown-footer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.apply-button, .cancel-button {
  padding: 6px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-button {
  background-color: #1a73e8;
  color: white;
  border-color: #1a73e8;
}

.apply-button:hover {
  background-color: #1557b0;
}

.cancel-button {
  background-color: #f8f9fa;
  color: #333;
}

.cancel-button:hover {
  background-color: #e8eaed;
}

.suspected-food-multi-input {
  margin-top: 4px;
}

.suspected-food-title {
  display: flex;
  align-items: center;
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
}

.suspected-food-input {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: "Noto Sans KR", sans-serif;
  background-color: #fff;
  color: #333;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.suspected-food-input:hover {
  border-color: #1a73e8;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
}

.suspected-food-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.suspected-food-input::placeholder {
  color: #999;
  font-style: italic;
}

.export-chart-button.saved {
  background-color: #1a73e8;
  color: #fff;
}
.export-chart-button.unsaved {
  background-color: transparent;
  color: #1a73e8;
  border: 2px solid #1a73e8;
  border-radius: 4px;
}


</style>