import type { Meta, StoryObj } from "@storybook/react-vite";

function Welcome() {
  return (
    <main>
      <h1>YoRHa 디자인 시스템</h1>
      <p>비공식 팬 프로젝트 · Unofficial fan project, not affiliated with Square Enix or PlatinumGames.</p>
    </main>
  );
}

const meta = { title: "소개/Welcome", component: Welcome } satisfies Meta<typeof Welcome>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
