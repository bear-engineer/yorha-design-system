import { Link, useParams } from "react-router";
import { SharedElement } from "~/components/route-transition";
import { units } from "./transitions-list";

export function meta() {
  return [{ title: "전환 상세 | YoRHa e2e" }];
}

export default function TransitionsDetail() {
  const { id } = useParams();
  const unit = units.find((u) => u.id === id) ?? units[0]!;
  return (
    <article aria-label="detail">
      <SharedElement name={`unit-title-${unit.id}`}>
        <h1>{unit.title}</h1>
      </SharedElement>
      <Link to="/transitions" replace data-testid="replace-home">Replace to list</Link>
      <Link to="/transitions">Back to list</Link>
    </article>
  );
}
