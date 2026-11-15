import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SystemMenuLayout, type SystemMenuSection } from "@/components/system-menu-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { TimelineGraph, type TimelineGraphItem, type TimelineLane } from "@/components/ui/timeline";

function ProfilePanel() {
  return (
    <div className="flex flex-col gap-6">
      <TextField label="유닛 이름" description="표시 이름, 최대 10자" defaultValue="2B" maxLength={10} />
      <div>
        <Dialog>
          <DialogTrigger render={<Button variant="danger" />}>데이터 초기화</DialogTrigger>
          <DialogContent>
            <DialogTitle>설정 초기화 확인</DialogTitle>
            <DialogBody>
              <DialogDescription>저장된 유닛 설정을 모두 지운다. 되돌릴 수 없다.</DialogDescription>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>취소</DialogClose>
              <DialogClose render={<Button variant="danger" />}>초기화</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

const at = (day: number, hour: number) => new Date(2026, 10, day, hour).getTime();
const LANES: TimelineLane[] = [
  { id: "recon", label: "정찰" },
  { id: "combat", label: "전투" },
];
const MISSIONS: TimelineGraphItem[] = [
  { id: "scout", lane: "recon", title: "지역 정찰", start: at(16, 9), end: at(16, 15) },
  { id: "strike", lane: "combat", title: "거점 타격", start: at(16, 13), end: at(17, 4) },
  { id: "sync", lane: "recon", title: "기록 동기화", start: at(17, 9), status: "done" },
];

/** 드래그로 옮기고 양 끝으로 늘리며, 키보드는 Space로 들어올린다. 편집 가능한 일정은 defaultItems만으로 켜진다. */
function SchedulePanel() {
  return (
    <TimelineGraph
      label="임무 일정"
      lanes={LANES}
      defaultItems={MISSIONS}
      range={{ start: at(16, 0), end: at(18, 0) }}
      zoom={{ pxPerHour: 8 }}
      collision="block"
    />
  );
}

const SECTIONS: SystemMenuSection[] = [
  {
    id: "unit",
    label: "유닛",
    items: [
      { id: "profile", label: "프로필", description: "이름과 초기화", content: <ProfilePanel /> },
      { id: "schedule", label: "일정", description: "임무를 끌어 옮긴다", content: <SchedulePanel /> },
      { id: "notes", label: "메모", description: "유닛 기록", content: <p className="text-yorha-base text-yorha-fg">메모 항목은 준비 중이다.</p> },
    ],
  },
  {
    id: "system",
    label: "시스템",
    items: [
      { id: "display", label: "표시", description: "화면 옵션", content: <p className="text-yorha-base text-yorha-fg">표시 옵션은 준비 중이다.</p> },
    ],
  },
];

/** 설정 화면 블록. 라우트 모듈(app/routes/yorha-demo.tsx)로 복사해 쓴다. */
export function meta() {
  return [{ title: "설정 | YoRHa 데모" }];
}

export default function YorhaDemo() {
  return (
    <div lang="ko" className="w-full min-w-0">
      <AppShell
        header={<span className="font-yorha font-yorha-bold uppercase tracking-yorha-wide">YoRHa 설정</span>}
        footer={<p className="text-yorha-sm text-yorha-fg-soft">비공식 팬 프로젝트</p>}
      >
        <PageHeader eyebrow="설정 · SETTINGS" title="시스템 설정" description="유닛 정보와 시스템 항목을 조정한다." className="mb-4" />
        <SystemMenuLayout sections={SECTIONS} label="설정 구획" />
      </AppShell>
    </div>
  );
}
