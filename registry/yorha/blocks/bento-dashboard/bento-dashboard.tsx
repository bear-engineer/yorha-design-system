import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
// route-transition registers a popstate listener on import. In your app, import it (here or in root.tsx)
// BEFORE createBrowserRouter()/the router is created, or back/forward transitions will not run.
import { SharedElement } from "@/components/route-transition";
import { Bento, BentoTile } from "@/components/bento";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, DataTableBody, DataTableCell, DataTableHeader, DataTableHeadCell, DataTableRow } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Meter } from "@/components/ui/meter";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline, type TimelineEvent } from "@/components/ui/timeline";

type ViewState = "ready" | "loading" | "empty" | "error";

const STATES: Array<{ id: ViewState; label: string }> = [
  { id: "ready", label: "정상" },
  { id: "loading", label: "로딩" },
  { id: "empty", label: "비어 있음" },
  { id: "error", label: "오류" },
];

interface Unit {
  id: string;
  name: string;
  role: string;
  hp: number;
  online: boolean;
}

const UNITS: Unit[] = [
  { id: "2b", name: "유닛 2B", role: "전투", hp: 82, online: true },
  { id: "9s", name: "유닛 9S", role: "정찰", hp: 64, online: true },
  { id: "a2", name: "유닛 A2", role: "유격", hp: 31, online: false },
];

const EVENTS: TimelineEvent[] = [
  { id: "e1", time: "2026-11-14T09:10:00+09:00", title: "동기화 완료", status: "success", body: "벙커 서버와 기록을 맞췄습니다." },
  { id: "e2", time: "2026-11-14T08:42:00+09:00", title: "유닛 A2 연결 끊김", status: "danger" },
  { id: "e3", time: "2026-11-14T07:55:00+09:00", title: "정기 점검 시작" },
];

export function meta() {
  return [{ title: "유닛 대시보드 | YoRHa 데모" }];
}

function Tile({ area, title, children }: { area: string; title: string; children: ReactNode }) {
  return (
    <BentoTile area={area}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Heading level={2} className="text-yorha-base">
          {title}
        </Heading>
        {children}
      </div>
    </BentoTile>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 text-yorha-sm text-yorha-fg-soft">{children}</p>;
}

function Placeholder({ area, title }: { area: string; title: string }) {
  return (
    <Tile area={area} title={title}>
      <Skeleton label={`${title} 로딩 중`} className="h-full min-h-16 w-full" />
    </Tile>
  );
}

function UnitTable() {
  return (
    <DataTable caption="유닛 목록" density="dense">
      <DataTableHeader>
        <DataTableRow>
          <DataTableHeadCell>이름</DataTableHeadCell>
          <DataTableHeadCell>임무</DataTableHeadCell>
          <DataTableHeadCell>상태</DataTableHeadCell>
          <DataTableHeadCell className="text-right">HP</DataTableHeadCell>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        {UNITS.map((unit) => (
          <DataTableRow key={unit.id}>
            <DataTableCell>
              <Link to={{ search: `?unit=${unit.id}` }} className="rounded-yorha font-yorha-medium text-yorha-fg-strong underline focus-visible:yorha-focus">
                <SharedElement name={`unit-${unit.id}`}>
                  <span>{unit.name}</span>
                </SharedElement>
              </Link>
            </DataTableCell>
            <DataTableCell>{unit.role}</DataTableCell>
            <DataTableCell>
              <Badge variant={unit.online ? "neutral" : "alert"}>{unit.online ? "가동" : "오프라인"}</Badge>
            </DataTableCell>
            <DataTableCell numeric>{unit.hp}</DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

function DashboardTiles({ state }: { state: "ready" | "loading" | "empty" }) {
  if (state === "loading") {
    return (
      <Bento preset="dashboard" stagger={false}>
        <Placeholder area="hero" title="코어" />
        <Placeholder area="a" title="배터리" />
        <Placeholder area="b" title="담당" />
        <Placeholder area="chart" title="기록" />
        <Placeholder area="list" title="유닛 현황" />
      </Bento>
    );
  }
  const empty = state === "empty";
  return (
    <Bento preset="dashboard">
      <Tile area="hero" title="코어">
        {empty ? <Empty>집계된 코어 데이터가 없습니다</Empty> : (
          <>
            <Meter label="코어 가동률" value={87} />
            <Progress label="동기화" value={64} />
          </>
        )}
      </Tile>
      <Tile area="a" title="배터리">
        {empty ? <Empty>데이터 없음</Empty> : <Meter label="배터리" value={46} />}
      </Tile>
      <Tile area="b" title="담당">
        {empty ? <Empty>배정 없음</Empty> : (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>2B</AvatarFallback>
            </Avatar>
            <Badge>대기 중</Badge>
          </div>
        )}
      </Tile>
      <Tile area="chart" title="기록">
        {empty ? <Empty>기록이 없습니다</Empty> : <Timeline label="최근 기록" items={EVENTS} />}
      </Tile>
      <Tile area="list" title="유닛 현황">
        {empty ? <Empty>표시할 유닛이 없습니다</Empty> : <UnitTable />}
      </Tile>
    </Bento>
  );
}

function UnitDetail({ id }: { id: string }) {
  const unit = UNITS.find((u) => u.id === id);
  if (!unit) {
    return (
      <div className="flex flex-col gap-3">
        <Empty>유닛을 찾을 수 없습니다</Empty>
        <Link to={{ search: "" }} className="w-fit underline focus-visible:yorha-focus">목록으로</Link>
      </div>
    );
  }
  return (
    <article aria-label="유닛 상세" className="flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{unit.id}</AvatarFallback>
        </Avatar>
        <SharedElement name={`unit-${unit.id}`}>
          <Heading level={2}>{unit.name}</Heading>
        </SharedElement>
        <Badge variant={unit.online ? "neutral" : "alert"}>{unit.online ? "가동" : "오프라인"}</Badge>
      </div>
      <Meter label="HP" value={unit.hp} />
      <Card title="임무" meta={unit.role} />
      <Link to={{ search: "" }} className="w-fit underline focus-visible:yorha-focus">목록으로</Link>
    </article>
  );
}

/**
 * Bento 대시보드 블록. 라우트 모듈(app/routes/bento-dashboard.tsx)로 복사해 쓴다.
 * 표시 상태(정상/로딩/비어 있음/오류)는 데모용 전환 버튼이며, 실제 앱에서는 로더 상태로 바꾼다.
 * 유닛 이름 링크를 누르면 `?unit=<id>` 상세로 가고, SharedElement가 이름을 제목으로 잇는다.
 */
export default function BentoDashboardRoute() {
  const [params] = useSearchParams();
  const unitId = params.get("unit");
  const [state, setState] = useState<ViewState>("ready");
  const [focusContent, setFocusContent] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  // After "다시 시도" the button that had focus is gone; land on the content region instead of <body>.
  useEffect(() => {
    if (focusContent && state === "ready") {
      contentRef.current?.focus();
      setFocusContent(false);
    }
  }, [focusContent, state]);

  return (
    <main aria-label="본문" lang="ko" className="min-h-screen bg-yorha-bg pb-8 text-yorha-fg">
      <PageHeader eyebrow="SEC-12" title="유닛 대시보드" description="코어 상태와 유닛 현황을 한 화면에서 봅니다." />
      <div className="flex flex-col gap-4 px-6 pt-4">
        {unitId === null ? (
          <div role="group" aria-label="표시 상태" className="flex flex-wrap gap-2">
            {STATES.map((s) => (
              <Button key={s.id} variant={state === s.id ? "primary" : "default"} size="sm" aria-pressed={state === s.id} onClick={() => setState(s.id)}>
                {s.label}
              </Button>
            ))}
          </div>
        ) : null}
        <section aria-label="대시보드 내용" tabIndex={-1} ref={contentRef} className="outline-none focus-visible:yorha-focus">
          {unitId !== null ? (
            <UnitDetail id={unitId} />
          ) : state === "error" ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-yorha border border-yorha-alert-ui bg-yorha-panel p-4">
              <p className="m-0 font-yorha-bold text-yorha-alert">데이터를 불러오지 못했습니다</p>
              <Button
                onClick={() => {
                  setState("ready");
                  setFocusContent(true);
                }}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <DashboardTiles state={state} />
          )}
        </section>
      </div>
    </main>
  );
}
