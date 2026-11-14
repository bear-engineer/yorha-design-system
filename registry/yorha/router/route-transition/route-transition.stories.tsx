import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { expect, spyOn, userEvent, within, waitFor } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import {
  RouteTransition,
  SegmentTransition,
  SharedElement,
  changeSegment,
  useRouteTransition,
} from "@/components/route-transition";
import { NavLink } from "@/components/nav-link";

const meta = {
  title: "라우터/RouteTransition",
  component: RouteTransition,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } }, layout: "padded" },
} satisfies Meta<typeof RouteTransition>;
export default meta;
type Story = StoryObj<typeof meta>;

function Layout() {
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 bg-yorha-panel p-2">
      <nav aria-label="주 메뉴" className="flex">
        <NavLink to="/" end>홈</NavLink>
        <NavLink to="/units">유닛</NavLink>
      </nav>
      <section aria-label="본문" className="border border-yorha-border p-4 text-yorha-fg-ink">
        <RouteTransition />
      </section>
    </div>
  );
}

const routes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <h2 className="text-yorha-lg">홈 화면</h2> },
      { path: "units", element: <h2 className="text-yorha-lg">유닛 목록</h2> },
    ],
  },
];

/** 라우트를 바꾸면 새 화면이 나타납니다. 모션이 `full`일 때만 전환 래퍼가 켜집니다. */
export const Default: Story = {
  parameters: { route: { routes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("heading", { name: "홈 화면" })).toBeInTheDocument();
    const wrapper = canvasElement.querySelector("[data-route-transition]");
    await expect(wrapper).toHaveAttribute("data-route-transition", "on");
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("heading", { name: "유닛 목록" })).toBeInTheDocument());
    await expect(c.queryByRole("heading", { name: "홈 화면" })).toBeNull();
  },
};

/** `data-motion="reduced"`에서는 이동 없이 120ms 크로스페이드만 남기므로 래퍼가 `reduced`로 표시됩니다. */
export const ReducedMotion: Story = {
  parameters: { route: { routes } },
  globals: { motion: "reduced" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-motion", "reduced"));
    await expect(await c.findByRole("heading", { name: "홈 화면" })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "reduced"));
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("heading", { name: "유닛 목록" })).toBeInTheDocument());
    await expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-reduced-fade").trim()).toBe("120ms");
    await expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
  },
};

/** `off`도 같은 방식으로 전환을 끕니다. */
export const MotionOff: Story = {
  parameters: { route: { routes } },
  globals: { motion: "off" },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "off"));
  },
};

function DirectionProbe() {
  const { direction, mode } = useRouteTransition();
  return (
    <p data-testid="probe">
      {direction}/{mode}
    </p>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)} className="border border-yorha-border px-2 text-yorha-fg-ink">
      뒤로
    </button>
  );
}

function PageShell() {
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 bg-yorha-panel p-2 text-yorha-fg-ink">
      <nav aria-label="이동" className="flex gap-2">
        <Link to="/">목록</Link>
        <Link to="/unit/2b">2B</Link>
        <Link to="/unit/9s" replace>9S로 교체</Link>
        <BackButton />
      </nav>
      <section aria-label="본문" className="border border-yorha-border p-4">
        <RouteTransition />
      </section>
    </div>
  );
}

const directionRoutes = [
  {
    path: "/",
    element: <PageShell />,
    children: [
      { index: true, element: <DirectionProbe /> },
      { path: "unit/:id", element: <DirectionProbe /> },
    ],
  },
];

/** 링크(PUSH)는 `forward`, 뒤로 가기(POP)는 `back`, `replace` 링크는 `replace`로 훅과 래퍼에 노출됩니다. */
export const Direction: Story = {
  parameters: { route: { routes: directionRoutes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const wrapper = () => canvasElement.querySelector("[data-route-transition]");
    await waitFor(() => expect(c.getByTestId("probe")).toHaveTextContent("replace/on"));
    await userEvent.click(c.getByRole("link", { name: "2B" }));
    await waitFor(() => expect(c.getByTestId("probe")).toHaveTextContent("forward/on"));
    await userEvent.click(c.getByRole("button", { name: "뒤로" }));
    await waitFor(() => expect(c.getByTestId("probe")).toHaveTextContent("back/on"));
    await expect(wrapper()).toHaveAttribute("data-direction", "back");
    await userEvent.click(c.getByRole("link", { name: "9S로 교체" }));
    await waitFor(() => expect(c.getByTestId("probe")).toHaveTextContent("replace/on"));
  },
};

/** The ::view-transition overlay swallows pointer events until the transition ends. */
const transitionSettled = () =>
  waitFor(() => expect((document as Document & { activeViewTransition?: unknown }).activeViewTransition ?? null).toBeNull(), {
    timeout: 3000,
  });

const cards = [
  { id: "2b", title: "유닛 2B", note: "암살 특화 모델" },
  { id: "9s", title: "유닛 9S", note: "정찰 특화 모델" },
];

function CardList() {
  return (
    <section aria-label="유닛 목록" className="flex flex-col gap-2">
      {cards.map((card) => (
        <Link key={card.id} to={`/units/${card.id}`} className="border border-yorha-border p-3 no-underline">
          <SharedElement name={`card-title-${card.id}`}>
            <span className="text-yorha-base font-yorha-medium">{card.title}</span>
          </SharedElement>
        </Link>
      ))}
    </section>
  );
}

function CardDetail({ id }: { id: string }) {
  const card = cards.find((item) => item.id === id) ?? cards[0]!;
  return (
    <article aria-label="유닛 상세" className="flex flex-col gap-2">
      <SharedElement name={`card-title-${card.id}`}>
        <h2 className="text-yorha-lg">{card.title}</h2>
      </SharedElement>
      <p>{card.note}</p>
      <Link to="/">목록으로</Link>
    </article>
  );
}

const sharedRoutes = [
  {
    path: "/",
    element: (
      <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 bg-yorha-panel p-2 text-yorha-fg-ink">
        <RouteTransition />
      </div>
    ),
    children: [
      { index: true, element: <CardList /> },
      { path: "units/2b", element: <CardDetail id="2b" /> },
      { path: "units/9s", element: <CardDetail id="9s" /> },
    ],
  },
];

/** 목록 카드 제목이 상세 제목과 같은 `SharedElement` 이름으로 이어집니다. 뒤로 가면 다시 목록으로 돌아옵니다. */
export const ListToDetail: Story = {
  parameters: { route: { routes: sharedRoutes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("link", { name: "유닛 9S" }));
    await expect(await c.findByRole("heading", { name: "유닛 9S" })).toBeInTheDocument();
    await expect(c.queryByRole("link", { name: "유닛 2B" })).toBeNull();
    await transitionSettled();
    await userEvent.click(c.getByRole("link", { name: "목록으로" }));
    await expect(await c.findByRole("link", { name: "유닛 9S" }, { timeout: 2000 })).toBeInTheDocument();
    await expect(c.getByRole("link", { name: "유닛 2B" })).toBeInTheDocument();
  },
};

/** 같은 이름의 `SharedElement`를 동시에 두 개 마운트하면 개발 모드에서 경고합니다. */
export const DuplicateNameWarning: Story = {
  render: () => (
    <div className="text-yorha-fg-ink">
      <SharedElement name="dup-name"><p>첫째</p></SharedElement>
      <SharedElement name="dup-name"><p>둘째</p></SharedElement>
    </div>
  ),
  beforeEach: () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    return () => warn.mockRestore();
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText("둘째");
    await waitFor(() => expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"dup-name"')));
  },
};

const order = ["overview", "logs", "settings"];
const labels: Record<string, string> = { overview: "개요", logs: "로그", settings: "설정" };

function SegmentsDemo() {
  const [value, setValue] = useState("overview");
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 bg-yorha-panel p-2 text-yorha-fg-ink">
      <div role="group" aria-label="구역" className="flex gap-2">
        {order.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            className="border border-yorha-border px-2 aria-pressed:bg-yorha-ink aria-pressed:text-yorha-on-ink"
            onClick={() => changeSegment(order, value, id, () => setValue(id))}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <SegmentTransition value={value}>
        <p data-testid="segment-panel">{labels[value]} 패널</p>
      </SegmentTransition>
    </div>
  );
}

/** 탭·세그먼트는 순서를 비교해 방향 전환으로 바뀝니다. 패널은 선택한 값을 따라갑니다. */
export const Segments: Story = {
  render: () => <SegmentsDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByTestId("segment-panel")).toHaveTextContent("개요 패널");
    await userEvent.click(c.getByRole("button", { name: "설정" }));
    await waitFor(() => expect(c.getByTestId("segment-panel")).toHaveTextContent("설정 패널"));
    await userEvent.click(c.getByRole("button", { name: "로그" }));
    await waitFor(() => expect(c.getByTestId("segment-panel")).toHaveTextContent("로그 패널"));
    await expect(c.getByRole("button", { name: "로그" })).toHaveAttribute("aria-pressed", "true");
  },
};

/** `document.startViewTransition`이 없으면 애니메이션 없이 바로 새 화면을 렌더링합니다. */
export const Unsupported: Story = {
  parameters: { route: { routes } },
  beforeEach: () => {
    Object.defineProperty(document, "startViewTransition", { value: undefined, configurable: true });
    return () => {
      delete (document as unknown as Record<string, unknown>).startViewTransition;
    };
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("heading", { name: "홈 화면" })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "unsupported"));
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("heading", { name: "유닛 목록" })).toBeInTheDocument());
  },
};
