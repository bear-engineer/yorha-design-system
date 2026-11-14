# AGENTS.md — yorha-design-system

이 저장소는 NieR:Automata의 YoRHa UI를 재해석한 **비공식 팬 디자인 시스템**이다. Square Enix·PlatinumGames와 무관하며 상업적으로 사용하지 않는다.

## 정본(SOT)
- 디자인 정본은 Storybook이다. 토큰·컴포넌트·레이아웃·설치 가이드는 스토리/MDX에서 나온다.
- 토큰 정본은 `tokens/*.tokens.json`(DTCG 2025.10) 하나다. `src/styles/tokens.generated.css`, `registry/yorha/base/registry.json`의 cssVars, `src/docs/foundations/*.generated.*`는 `pnpm tokens:build`로만 만든다. 생성물을 손으로 고치지 않는다.
- 계획: `~/.hermes/research/yorha-design-system/plan.md`(수락본). 리서치: 같은 폴더의 `briefing.ko.md`, `dossier.md`.

## 구조
- `registry/yorha/<group>/<name>/` = 레지스트리 항목 1개. `registry.json`(항목 정의), `<name>.tsx`(주 파일, 다른 항목은 이 파일만 import), `<name>.stories.tsx`(스토리 + play 테스트, 배포 안 됨).
- 항목 간 import는 소비자 별칭 형태로 쓴다: `@/components/ui/<name>`, `@/components/<name>`, `@/lib/<name>`, `@/hooks/<name>`. 저장소 안에서는 `tsconfig.json` paths가 해석한다(paths는 `pnpm scaffold:paths`로 생성).
- `registryDependencies`에는 항상 `@yorha/<name>`을 쓴다. 맨 이름은 shadcn 공식 레지스트리로 해석되어 실패한다(`pnpm registry:lint`가 막는다).
- 루트 `registry.json`의 `include` 목록은 항목 디렉터리마다 한 줄이다.

## 규칙
- 코딩 표준: TDD(실패하는 스토리 play 테스트/단위 테스트를 먼저 커밋, 그다음 구현), SOT(사실 하나에 정의 하나), SOLID, 클린 아키텍처(컴포넌트는 프리미티브·토큰에 의존, 반대 방향 금지).
- 프리미티브는 `@base-ui/react`. Base UI의 함수형 `className`을 받을 수 있게 `cn`과 prop 타입을 쓴다.
- 접근성: 모든 스토리는 `a11y.test='error'`에서 통과해야 한다(authentic 테마 스토리만 `todo`, 사유 명시). 인터랙티브 컴포넌트는 키보드 play 테스트를 가진다. `outline: none` 금지, `:focus-visible` 스타일 필수, hover 전용 상태 금지.
- 모션: `data-motion`(full|reduced|off)을 따른다. 플래시는 초당 3회 이하. 5초 넘는 자동 동작에는 일시정지 수단.
- 사운드: 기본 꺼짐. 효과음은 WebAudio 절차 생성만. 오디오 파일 커밋 금지.
- IP: 원작 폰트(Rodin 등)·로고·효과음·스크린샷·트레이스 SVG를 넣지 않는다. 폰트는 OFL만.
- 공개 저장소: 비밀값·키·개인 이메일·로컬 절대경로 커밋 금지. 커밋 신원은 저장소 로컬 bear-engineer noreply. 커밋 전 `pnpm lint:secrets`(gitleaks).
- 버전 고정: shadcn 4.23.0, storybook 10.6.7, react 19.3.1, react-router 8.5.1, tailwindcss 4.3.5, @base-ui/react 1.9.0.

## 명령
- `pnpm typecheck` · `pnpm test` (단위) · `pnpm test:storybook` (스토리 + a11y + play) · `pnpm build-storybook`
- `pnpm tokens:build` · `pnpm registry:validate` · `pnpm registry:lint` · `pnpm registry:build`
- `pnpm test:vrt` · `pnpm e2e:registry` · `pnpm lint:secrets`
