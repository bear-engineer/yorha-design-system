# yorha-design-system

[![CI](https://github.com/bear-engineer/yorha-design-system/actions/workflows/ci.yml/badge.svg)](https://github.com/bear-engineer/yorha-design-system/actions/workflows/ci.yml)
[![Pages](https://github.com/bear-engineer/yorha-design-system/actions/workflows/pages.yml/badge.svg)](https://github.com/bear-engineer/yorha-design-system/actions/workflows/pages.yml)

NieR:Automata의 YoRHa UI를 요즘 웹 UX에 맞게 다시 해석한 **비공식 팬 디자인 시스템**입니다.
npm 패키지가 아니라 **소스 복사형 레지스트리**로 배포합니다. 필요한 컴포넌트의 소스 파일을 앱에 복사해 넣고, 복사한 코드는 앱이 소유합니다.

> Square Enix, PlatinumGames 및 NieR 시리즈 권리자와 관련이 없고, 승인이나 후원을 받지 않았습니다. 상업적으로 사용하지 않습니다. 원작의 로고, 폰트, 효과음, 스크린샷은 포함하지 않습니다. 자세한 내용은 [NOTICE.md](NOTICE.md)를 보세요.

- **문서(Storybook, 디자인 정본)**: https://bear-engineer.github.io/yorha-design-system/
- **레지스트리**: `https://bear-engineer.github.io/yorha-design-system/r/{name}.json`
- **릴리스 노트**: [Releases](https://github.com/bear-engineer/yorha-design-system/releases)

## 특징

- **항목 94개**: UI 컴포넌트 71개, 레이아웃·라우터·프로바이더 14개, 화면 블록 4개, 유틸리티 3개, 기반(`base`·`init`) 2개. 버튼·폼·오버레이·데이터 테이블·타임라인·칸반·달력·커맨드 팔레트까지 포함합니다.
- **토큰 한 곳에서 생성**: DTCG 2025.10 형식의 `tokens/*.tokens.json`(OKLCH, hex 대체값)에서 CSS 변수, 레지스트리 `cssVars`, 문서 데이터를 만듭니다. 생성물은 손으로 고치지 않습니다.
- **환경 설정**: 테마 4종(`light`, `dark`, `high-contrast`, `authentic`), 밀도 2종(`comfortable`, `compact`), 모션 3단계(`full`, `reduced`, `off`, 기본은 시스템 설정을 따름). `<html>`의 `data-*` 속성으로 바꿉니다. `authentic`은 원작의 낮은 대비를 재현한 장식용 테마입니다.
- **사운드는 기본 꺼짐**: 켜면 WebAudio로 효과음을 절차 생성합니다. 오디오 파일은 들어 있지 않습니다.
- **접근성**: 모든 스토리가 axe 검사(위반 시 실패)를 통과해야 합니다. 조작 대상 24×24px 이상(WCAG 2.5.8), 텍스트 간격(1.4.12), 320px 리플로를 테스트로 검사합니다. 키보드 조작에는 play 테스트를 둡니다.
- **상태가 바뀌어도 레이아웃이 움직이지 않음**: hover, 포커스, 선택, 로딩 같은 상태 변화는 크기와 위치를 바꾸지 않습니다. 모든 모션은 매끄럽게 움직이고, 픽셀 느낌은 정적인 도트 글리프와 패턴으로만 냅니다.
- **프리미티브**: [Base UI](https://base-ui.com) 위에 만들었습니다. 정밀 포인터에서는 날짜·주·월·시각 입력이 OS 선택기 대신 키트 선택기를 엽니다(터치에서는 네이티브 선택기를 유지합니다).

## 요구 사항 (소비 앱)

- React 19.3 이상, react-router 8.x
- Tailwind CSS v4
- shadcn CLI 4.23.0 (설치 도구로만 사용합니다. shadcn 기본 스타일은 들어가지 않습니다.)

## 설치

React Router + Tailwind CSS v4 앱 기준입니다. 자세한 내용은 Storybook의 `가이드/Installation` 문서를 보세요.

1. 이 저장소의 [`templates/components.json`](templates/components.json)을 앱 루트에 `components.json`으로 복사합니다. `style: "yorha"`는 CLI가 요구하는 자리표시자이니 그대로 둡니다. `tailwind.css`와 `aliases`는 앱 구조에 맞게 고칩니다.
2. react-router 템플릿의 `app/app.css`에서 레이어 밖에 있는 `html, body` 배경·`color-scheme` 규칙을 지웁니다. 이 규칙이 키트의 `@layer base`보다 우선하기 때문입니다.
3. 항목을 설치합니다. 항목 이름 앞에는 항상 `@yorha/`를 붙입니다. 이름만 쓰면 shadcn 기본 레지스트리를 찾습니다.

```sh
npx shadcn@4.23.0 add @yorha/base @yorha/init @yorha/button
```

특정 브랜치·태그·커밋에서 바로 설치하려면 GitHub 소스 형식을 씁니다. 항목 내부의 `@yorha/...` 의존성을 풀어야 하므로 `components.json`의 `registries` 설정은 유지합니다.

```sh
npx shadcn@4.23.0 add bear-engineer/yorha-design-system/button#main
```

`#main` 자리에는 브랜치, 태그, 커밋을 쓸 수 있습니다. `update` 명령은 없습니다. `add --diff <파일>`로 차이를 확인한 뒤 `add --overwrite`로 덮어씁니다.

## 개발

Node 22.22 이상과 pnpm 12.14(corepack)를 씁니다.

```sh
corepack enable
pnpm install
pnpm exec playwright install chromium   # 브라우저 테스트용
git config core.hooksPath .githooks      # 커밋 전 gitleaks 검사
pnpm storybook                           # http://localhost:6006
```

| 명령 | 하는 일 |
| --- | --- |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm test` | 단위 테스트 (토큰 생성기, 레지스트리 lint, 대비 계산 등) |
| `pnpm test:storybook` | 모든 스토리의 play 테스트와 axe 접근성 검사 |
| `pnpm test:stability` | 상태 변화 중 크기·위치 불변, 320px 리플로, 픽셀 정렬 |
| `pnpm test:text-spacing` | WCAG 1.4.12 텍스트 간격에서 글자 잘림 없음 |
| `pnpm test:vrt` | 시각 회귀 테스트 (기준 이미지는 현재 macOS Chromium만 있음) |
| `pnpm tokens:build` | 토큰에서 CSS·레지스트리·문서 데이터 생성 |
| `pnpm registry:lint` · `pnpm registry:validate` | 레지스트리 규칙과 스키마 검사 |
| `pnpm registry:build` | `public/r/`에 정적 레지스트리 생성 |
| `pnpm build-storybook` | `storybook-static/`에 정적 문서 생성 |
| `pnpm docs:axe` · `pnpm docs:scroll` · `pnpm docs:theme` | 정적 문서 전체의 접근성, 저절로 스크롤되지 않음, 테마 전환 검사 (`build-storybook` 뒤에 실행) |
| `pnpm e2e:registry` | 빈 react-router 앱에 실제로 설치해 빌드·SSR·키보드·axe 확인 |
| `pnpm lint:secrets` | gitleaks로 전체 히스토리 비밀값 검사 |
| `pnpm release:notes --unreleased --tag vX.Y.Z` | 다음 릴리스 노트 미리보기 |

기여 규칙(TDD, 단일 정본, 레지스트리 구조, 접근성·모션 규칙)은 Storybook의 `가이드/Contributing` 문서와 [AGENTS.md](AGENTS.md)에 있습니다.

## CI와 배포

- **CI** (`.github/workflows/ci.yml`): `main` 푸시와 PR에서 비밀값 검사, 타입 검사, 단위 테스트, 토큰 생성물 일치, 레지스트리 검사, Storybook 테스트, 정적 문서 검사, 텍스트 간격, 설치 E2E(정적 경로, 그리고 푸시일 때 GitHub 소스 경로)를 돌립니다. 시각 회귀 작업은 Linux 기준 이미지가 생길 때까지 결과만 보고하고 실패로 막지는 않습니다.
- **Pages** (`.github/workflows/pages.yml`): `main` 푸시마다 Storybook과 레지스트리(`/r/`)를 GitHub Pages에 배포합니다.
- **릴리스** (`.github/workflows/release.yml`): CI가 녹색인 `main` 커밋에 버전 태그를 붙여 푸시하면, 이전 태그 이후 커밋으로 릴리스 노트를 만들고([git-cliff](https://git-cliff.org), `cliff.toml`) 그 버전의 레지스트리 묶음(`yorha-registry-vX.Y.Z.tar.gz`)을 첨부합니다.

```sh
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

발행한 태그는 옮기지 않습니다. 고칠 내용이 있으면 새 패치 태그를 냅니다.

## 저장소 구조

```
registry/yorha/<그룹>/<이름>/   레지스트리 항목 하나 (registry.json, 주 파일, 스토리)
  base/ lib/ ui/ layout/ router/ providers/ blocks/ sound/
registry.json                    루트 레지스트리 (항목별 include)
tokens/                          디자인 토큰 정본 (DTCG)
scripts/                         토큰 생성기, 레지스트리 lint, 문서 검사 스크립트
src/docs/                        Storybook 가이드·기초 문서 (MDX)
stability/ text-spacing/ vrt/    브라우저 테스트 프로젝트
e2e/                             소비 앱 설치 E2E
templates/                       소비 앱용 components.json
```

## 라이선스

코드는 [MIT](LICENSE)입니다. 폰트는 npm 의존성으로 설치되며 SIL Open Font License 1.1을 따릅니다(Pretendard, Noto Sans KR/JP, Zen Kaku Gothic New, M PLUS 1 Code). NieR, NieR:Automata, YoRHa는 각 권리자의 상표 또는 등록상표입니다. 권리자의 요청이 있으면 공개를 중단합니다.
