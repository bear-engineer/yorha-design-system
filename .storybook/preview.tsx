import type { Preview } from "@storybook/react-vite";
import { decorators } from "./decorators";
import "../src/styles/storybook.css";

const preview: Preview = {
  decorators,
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
  },
};
export default preview;
