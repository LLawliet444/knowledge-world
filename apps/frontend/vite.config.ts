import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  publicDir: "../../assets",
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["duress-lubricate-unchain.ngrok-free.dev"],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
