import { stabilitySuite } from "./suite";

stabilitySuite("layout items and blocks: state changes never move the control", [
  { item: "app-shell" },
  { item: "bento" },
  { item: "breadcrumb" },
  { item: "hud-layout" },
  { item: "page-header" },
  { item: "sidebar" },
  { item: "system-menu-layout", stage: "top" } /* tab panels differ in height: a centred stage would re-centre the strip */,
  { item: "bento-dashboard", stories: ["Default"] },
  { item: "settings-form", stories: ["Default"] },
  { item: "yorha-demo", stories: ["Default"], exclude: 'a[href^="#"]' } /* skip link is revealed on focus by design */,
]);
