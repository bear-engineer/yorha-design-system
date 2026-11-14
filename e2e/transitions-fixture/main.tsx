// Minimal app for e2e/transitions.spec.ts. Imports the local route-transition source, not an installed copy.
import "virtual:yorha-route-css";
import "../../src/styles/tokens.generated.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Link, RouterProvider, createBrowserRouter } from "react-router";
import { RouteTransition, SharedElement, useRouteTransition } from "../../registry/yorha/router/route-transition/route-transition";

const units = [
  { id: "2b", title: "Unit 2B" },
  { id: "9s", title: "Unit 9S" },
  { id: "a2", title: "Unit A2" },
];

const motion = new URLSearchParams(location.search).get("motion");
if (motion) document.documentElement.dataset.motion = motion;

function Shell() {
  return (
    <main>
      <RouteTransition />
    </main>
  );
}

function List() {
  const { direction } = useRouteTransition();
  return (
    <section aria-label="units" data-direction={direction}>
      <h1>Units</h1>
      <ul>
        {units.map((u) => (
          <li key={u.id}>
            <Link to={`/units/${u.id}`}>
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

function Detail({ id }: { id: string }) {
  const unit = units.find((u) => u.id === id) ?? units[0]!;
  return (
    <article aria-label="detail">
      <SharedElement name={`unit-title-${unit.id}`}>
        <h1>{unit.title}</h1>
      </SharedElement>
      <Link to="/" replace data-testid="replace-home">Replace to list</Link>
      <Link to="/">Back to list</Link>
    </article>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <List /> },
      { path: "units/2b", element: <Detail id="2b" /> },
      { path: "units/9s", element: <Detail id="9s" /> },
      { path: "units/a2", element: <Detail id="a2" /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
