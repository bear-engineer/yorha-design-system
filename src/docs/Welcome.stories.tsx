import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { Meter } from "@/components/ui/meter";

function Welcome() {
  return (
    <main lang="ko" className="border border-yorha-border bg-yorha-bg font-yorha text-yorha-fg">
      <PageHeader
        eyebrow="UNOFFICIAL FAN PROJECT"
        title="YoRHa 디자인 시스템"
        description="NieR:Automata의 YoRHa UI를 재해석한 비공식 팬 프로젝트 · Unofficial fan project, not affiliated with Square Enix or PlatinumGames."
      />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3 [&>*]:min-w-0">
        <Panel titleLevel={2} title="구성 현황" className="md:col-span-2">
          <div className="flex flex-col gap-4">
            <Meter label="컴포넌트" value={92} max={100} />
            <Meter label="접근성 검증" value={78} max={100} />
            <Meter label="문서화" value={64} max={100} low={40} />
          </div>
        </Panel>
        <Panel titleLevel={2} title="시작하기">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-yorha-sm">
            <li>설치: 레지스트리에서 필요한 소스만 복사</li>
            <li>테마: light · dark · high-contrast</li>
            <li>모션: full · reduced · off</li>
          </ul>
        </Panel>
      </div>
    </main>
  );
}

const meta = { title: "소개/Welcome", component: Welcome } satisfies Meta<typeof Welcome>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
