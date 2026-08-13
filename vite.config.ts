import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/rust-api-field-guide/",
  plugins: [react()],
});
