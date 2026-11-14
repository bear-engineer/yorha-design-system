# yorha-design-system

NieR:Automata의 YoRHa UI를 2025~26년 UX/UI에 맞게 재해석한 **비공식 팬 디자인 시스템**입니다. 자세한 고지는 [NOTICE.md](NOTICE.md)를 보세요.

- 정본: Storybook (`pnpm storybook`)
- 배포: 소스 복사형 레지스트리 (shadcn CLI 4.23.0을 전송 도구로 사용)
- 대상: React 19.3+ / react-router 8.x, Tailwind CSS v4
- 프리미티브: Base UI

## 설치 (소비 앱)
1. `templates/components.json`을 앱 루트에 복사합니다.
2. `npx shadcn@4.23.0 add @yorha/base @yorha/button`

자세한 가이드는 Storybook의 "설치" 문서를 보세요.
