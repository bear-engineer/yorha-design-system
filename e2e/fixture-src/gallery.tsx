import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/ui/heading";
import { Panel } from "~/components/ui/panel";

export default function Gallery() {
  return (
    <main className="p-8">
      <Panel>
        <Heading level={1}>요하 컴포넌트 갤러리</Heading>
        <p className="text-yorha-fg">한국어 본문 텍스트가 Pretendard 로 렌더링됩니다.</p>
        <div className="mt-4 flex gap-4">
          <Button>확인</Button>
          <Button variant="primary">저장</Button>
          <Badge>상태</Badge>
        </div>
      </Panel>
    </main>
  );
}
