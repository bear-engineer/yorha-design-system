import { Link } from "react-router";
import { SharedElement, useRouteTransition } from "~/components/route-transition";

export const units = [
  { id: "2b", title: "Unit 2B" },
  { id: "9s", title: "Unit 9S" },
  { id: "a2", title: "Unit A2" },
];

export function meta() {
  return [{ title: "전환 목록 | YoRHa e2e" }];
}

export default function TransitionsList() {
  const { direction } = useRouteTransition();
  return (
    <section aria-label="units" data-direction={direction}>
      <h1>Units</h1>
      <ul>
        {units.map((u) => (
          <li key={u.id}>
            <Link to={`/transitions/${u.id}`}>
              <SharedElement name={`unit-title-${u.id}`}>
                <span>{u.title}</span>
              </SharedElement>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
