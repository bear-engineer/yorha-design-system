import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Storybook-only Vite config. No reactRouter() plugin here (stories render routes via the router decorator).
export default defineConfig({ plugins: [react(), tailwindcss()], resolve: { tsconfigPaths: true } });
