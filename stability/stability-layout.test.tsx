import { stabilitySuite } from "./suite";

stabilitySuite("layout items and blocks: state changes never move the control", [
  { item: "app-shell" },
  { item: "bento" },
  { item: "breadcrumb" },
  { item: "hud-layout" },
  { item: "page-header" },
  { item: "sidebar" },
  { item: "system-menu-layout" },
  { item: "bento-dashboard", stories: ["Default"] },
  { item: "settings-form", stories: ["Default"] },
  { item: "yorha-demo", stories: ["Default"] },
]);
