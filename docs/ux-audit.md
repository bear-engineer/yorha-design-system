# UX 접근성 감사

## 기준과 범위

루트 `registry.json`의 `registry/yorha/ui`와 `registry/yorha/layout` include를 대상으로 상태 매트릭스를 기록한다. 해당하는 기본·비활성·읽기 전용·선택·오류·열림·로딩 및 포커스 상태를 살피고 Tab, 화살표, Escape 등 키보드 조작과 포커스 복귀의 일관성을 확인한다. 오류 메시지는 `aria-describedby`로 연결하며, 로딩 중에도 포커스를 유지해야 한다. 적용되지 않는 상태는 강제로 생성하지 않는다.

WCAG 2.5.8의 목표는 comfortable과 compact 양쪽에서 대상의 너비와 높이가 각각 24 CSS px 이상이다. 문장 속 인라인 링크는 해당 기준의 예외다. `>=24 (assert)`는 양 밀도에서 검사한 하한이며 정확한 실측 최소값이 아니다. 검사 헬퍼는 부동소수점 오차에 대해 0.5px 허용오차를 둔다. 숫자는 기록된 실측값만 기재한다. N/A는 항목 자체에 조작 대상이 없는 경우로, 전달된 자식 컨트롤의 적합성을 보증하지 않는다. PASS는 기재된 상태와 측정 범위에 한하며 전체 WCAG 적합성을 뜻하지 않는다. 근거가 없는 상호작용 항목은 HOLD다.

근거: `t10b.md`, `t10c.md`, `t10d.md`, `t10f.md` 핸드오프 및 `a949e35`, `01547e5`, `7c6e0a1`, `d920b5c`, `5603471`, `495ca31`, `82aea72` 커밋. 두 숫자는 comfortable / compact, 레이아웃의 단일 숫자는 두 밀도 중 최소값이다. 일부 상태 설명은 원본 테스트 용어를 유지한다.

## 항목별 결과

| 항목 | 확인한 상태 | 최소 대상 (px) | 결과 | 수정 커밋 |
| --- | --- | --- | --- | --- |
| button | 기본, 비활성, 로딩·Enter 후 포커스 유지 | >=24 (assert) | PASS | 없음 |
| icon-button | 크기별 기본, 비활성, 로딩·Enter 후 포커스 유지 | >=24 (assert) | PASS | 없음 |
| toggle | 상태·대상 측정 근거 없음 | 미측정 | HOLD | 없음 |
| checkbox | 상태·대상 측정 근거 없음 | 미측정 | HOLD | `d920b5c` |
| radio-group | 선택, 일부·전체 비활성 | >=24 (assert) | PASS | `d920b5c` |
| switch | 상태·대상 측정 근거 없음 | 미측정 | HOLD | `d920b5c` |
| slider | 기본, 범위, 비활성, 화살표 키 | >=24 (assert) | PASS | `d920b5c` |
| text-field | 기본, 읽기 전용, 비활성, 오류·aria-describedby | >=24 (assert) | PASS | 없음 |
| textarea | 기본, 읽기 전용, 비활성, 오류·aria-describedby | >=24 (assert) | PASS | 없음 |
| select | 기본, 비활성, 목록 열림·비활성 옵션, Esc 포커스 복귀 | >=24 (assert) | PASS | 없음 |
| number-field | 기본, 읽기 전용, 비활성 | >=24 (assert) | PASS | 없음 |
| field | 기본, 읽기 전용, 비활성, 오류·aria-describedby | >=24 (assert) | PASS | `7c6e0a1` (구조) |
| kbd | N/A — 키 표기, 자체 조작 대상 없음 | N/A | N/A | 없음 |
| dialog | 닫힌 트리거, 열림·팝업 포커스, Esc | 48 / 32 | PASS | 없음 |
| alert-dialog | 닫힌 트리거, 열림·취소/위험 | 48 / 32 | PASS | 없음 |
| popover | 닫힌 트리거, 열림·닫기 버튼 | 닫기 34 / 31; 트리거 44 / 37 | PASS | 없음 |
| tooltip | 기본, focus-visible·열림 | 트리거 43.6 / 37.2 | PASS | 없음 |
| menu | 닫힘, 열림·선택·라디오·비활성·강조, 필터 입력·행 | 행 36.9 / 31.1; 필터 행 38 / 32 | PASS (MenuClear 측정 제외) | 없음 |
| toast | 정보·성공·경고 및 닫기; 추가 시 트리거 포커스 유지 | >=24 (assert) | PASS | 없음 |
| progress | N/A — 진행 상태 표시 | N/A | N/A | 없음 |
| meter | N/A — 측정값 표시 | N/A | N/A | 없음 |
| spinner | N/A — 로딩 표시 | N/A | N/A | 없음 |
| skeleton | N/A — 자리 표시 | N/A | N/A | 없음 |
| accordion | 열림, 닫힘, 비활성, Tab 포커스 | >=24 (assert) | PASS | 없음 |
| tabs | 선택, 미선택, 비활성, ArrowRight 포커스 | >=24 (assert) | PASS | 없음 |
| menu-list | 기본, 선택, 비활성 행 | 48.4 / 40.4 | PASS | 없음 |
| panel | N/A — 배치 컨테이너 자체에는 조작 대상 없음 | N/A | N/A | 없음 |
| ornament | N/A — 장식 | N/A | N/A | 없음 |
| chip | 정적, 제거 가능, 선택 꺼짐/켜짐 | >=24 (assert) | PASS | `d920b5c` |
| badge | N/A — 상태 표시 | N/A | N/A | 없음 |
| decipher | N/A — 텍스트 효과 | N/A | N/A | 없음 |
| typer | N/A — 텍스트 효과 | N/A | N/A | 없음 |
| boot-log | N/A — 로그 표시 | N/A | N/A | 없음 |
| grid-background | N/A — 배경 장식 | N/A | N/A | 없음 |
| vignette | N/A — 배경 장식 | N/A | N/A | 없음 |
| heading | N/A — 제목 표시 | N/A | N/A | 없음 |
| data-table | 정렬 없음/오름차순, dense/comfortable, 정렬 시 포커스 유지 | >=24 (assert) | PASS | `d920b5c` |
| card | N/A — 콘텐츠 컨테이너 자체에는 조작 대상 없음 | N/A | N/A | 없음 |
| stack | N/A — 배치 컨테이너 | N/A | N/A | 없음 |
| grid | N/A — 배치 컨테이너 | N/A | N/A | 없음 |
| container | N/A — 배치 컨테이너 | N/A | N/A | 없음 |
| split | N/A — 배치 컨테이너 | N/A | N/A | 없음 |
| app-shell | 360px 접힘, 메뉴 버튼 포커스, 펼침 | 30.8 | PASS | 없음 |
| sidebar | 기본, 현재 페이지, focus-visible | 34.4 | PASS | 없음 |
| page-header | 기본, 비활성, focus-visible | 32.0 | PASS | 없음 |
| breadcrumb | 기본, 현재 페이지, focus-visible | 24.0 | PASS | `d920b5c` |
| system-menu-layout | 선택 탭, 탭 포커스, 목록 포커스 | 35.2 | PASS | `01547e5` (포커스 테스트) |
| hud-layout | 표시, 버튼 포커스; 숨김은 기존 스토리 | 24.0 | PASS | 없음 |
| prose | N/A — 본문 서식 자체에는 조작 대상 없음 | N/A | N/A | 없음 |
| text | N/A — 텍스트 표시 | N/A | N/A | 없음 |
| navigation-menu | 닫힌 트리거, 열린 패널 링크 | 트리거 38 / 25.6; 홈 링크 41 / 34 | PASS | 없음 |
| menubar | 닫힌 바, 체크박스·라디오 포함 열림 | 트리거 38 / 25.6; 행 36.9 / 31.4 | PASS | 없음 |
| toolbar | 기본, 토글 선택, 포커스 가능한 비활성, 입력, 링크 | >=24 (assert) | PASS | 없음 |
| bento | 링크 타일 기본, focus-visible | 25.6 (링크 텍스트; 실제 활성 영역은 타일 오버레이) | PASS | 없음 |
| input | 기본, 읽기 전용, 비활성, 오류·aria-describedby | >=24 (assert) | PASS | 없음 |
| otp-field | 기본, 비활성 | >=24 (assert) | PASS | 없음 |
| checkbox-group | 선택, 비활성 | >=24 (assert) | PASS | 없음 |
| form | 기본, 오류 제출 시 첫 오류 포커스·describedby | >=24 (assert) | PASS | 없음 |
| fieldset | N/A — 폼 그룹 구조; 내부 컨트롤은 별도 평가 | N/A | N/A | `7c6e0a1` (구조) |
| autocomplete | 기본, 비활성, 목록 열림 | >=24 (assert) | PASS | `5603471` |
| combobox | 기본, 선택·지우기, 비활성, 다중 칩·제거, 목록 열림 | >=24 (assert) | PASS | `5603471` (크기), `82aea72` (States 안정화) |
| toggle-group | 선택, 비활성 | >=24 (assert) | PASS | 없음 |
| avatar | N/A — 이미지·대체 텍스트 표시 | N/A | N/A | 없음 |
| collapsible | 닫힘, 열림, 비활성 | >=24 (assert) | PASS | 없음 |
| scroll-area | 상태·대상 측정 근거 없음 | 미측정 | HOLD | 없음 |
| separator | N/A — 시각적 구분선 | N/A | N/A | 없음 |
| timeline | 그래프 막대 포커스, 세로 목록 | >=24 (assert) | PASS | `d920b5c` |
| kanban | 기본, WIP 한도 초과, 키보드 픽업 시 핸들 포커스 유지 | >=24 (assert) | PASS | 없음 |
| drawer | 닫힌 트리거, 열림·팝업 포커스 | 48 / 32 | PASS | 없음 |
| context-menu | 우클릭 열림, 비활성·선택·라디오·링크 행 | 38 / 32 | PASS | 없음 |
| preview-card | focus-visible 열림, 본문 인라인 링크; 카드 내 대화형 요소 없음 | 인라인 예외 | PASS | 없음 |
| calendar | 선택, 범위, 오늘, 비활성 날짜, minDate; gridcell 직접 측정 | >=24 (assert) | PASS | 없음 |
| date-picker | 기본, 오류·aria-describedby, 비활성, 범위; Esc 후 포커스 복귀 | >=24 (assert) | PASS | 없음 |
| date-input | 기본, 선택기, 오류·describedby, 비활성 | >=24 (assert) | PASS | 없음 |
| color-input | 기본, 비활성, 잘못된 hex | >=24 (assert) | PASS | `495ca31` |
| file-input | 기본, maxSize 거부, 비활성 | >=24 (assert) | PASS | `495ca31` |
| password-input | 기본, 표시 토글, 오류, 비활성 | >=24 (assert) | PASS | 없음 |
| search-input | 기본, 값·지우기, 오류, 비활성 | >=24 (assert) | PASS | 없음 |
| input-types | 네이티브 22종 갤러리 | >=24 (assert) | PASS | 없음 |

## HOLD — 추가 감사 필요

`toggle`, `checkbox`, `switch`, `scroll-area`: 제공된 근거에서 해당 항목 자체의 상태 매트릭스와 대상 크기를 확인할 수 없어 통과를 추정하지 않았다. checkbox와 switch의 크기 수정 커밋은 실측 결과를 대신하지 않는다.

## 알려진 이슈

- `cn`에는 `tailwind-merge`가 없어 `date-picker`가 `!` 우선순위 override를 사용한다.
- `MenuClear`는 접근성 트리에서 숨겨져 대상 측정에 포함되지 않는다. `min-h-6`은 코드상의 선언이지 실측값이 아니다.
- kanban의 포인터·터치 드래그는 자동화되지 않았다. 키보드 픽업 중 포커스 확인과는 별개다.
