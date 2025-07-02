# Function Bar Button Tooltip Guide (VirtualScroll)

이 문서는 `DataInputVirtualScroll` 컴포넌트의 **Function Bar** 버튼에 적용할 툴팁 메시지를 정의합니다.  
메시지는 프로젝트 공통 규격인 [`TOOLTIP_STANDARDS.md`](../../TOOLTIP_STANDARDS.md)의 작성 규칙(완전한 한 문장, 존댓말, `~합니다` 체)과 동일한 형식을 따릅니다.

| 버튼 | 툴팁 메시지 | 비고 |
|------|-------------|------|
| 개별 노출시간 (`access_time`) | 개별 노출시간 열을 표시하거나 숨깁니다 | 토글 버튼 *(active 상태 지원)* |
| 데이터 가져오기 (`file_upload`) | Excel 파일에서 데이터를 가져와 현재 시트를 대체합니다 | 업로드 진행 중 텍스트 변경 | 
| 양식 다운로드 (`description`) | Excel 양식 파일을 다운로드합니다 | 버튼 hover 시 드롭다운 메뉴 노출 (툴팁 미표시) |
| 데이터 내보내기 (`file_download`) | 현재 입력된 모든 데이터를 Excel 파일로 다운로드합니다 |  |
| 전체 복사 (`content_copy`) | 모든 데이터를 클립보드에 복사합니다 |  |
| 빈 열 삭제 (`delete_outline`) | 데이터가 없는 빈 열들을 모두 삭제합니다 |  |
| 전체 초기화 (`refresh`) | 모든 데이터와 설정을 초기화하여 빈 시트로 되돌립니다 | 확인 다이얼로그 필요 |

> 📌 **참고**  
> 구버전(`DataInputRefactor`)에서 사용된 툴팁 문구를 그대로 이식하되, "양식 다운로드" 버튼은 호버 시 드롭다운 메뉴가 즉시 표시되므로 별도의 툴팁을 노출하지 않습니다. 필요 시 `showTooltip()` 호출을 생략하거나 `key === 'template'` 조건으로 필터링하세요. 