import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  envDir: "../",
  envPrefix: ["VITE_", "CONTRACT_", "PERKS_", "MOCK_"],
});
