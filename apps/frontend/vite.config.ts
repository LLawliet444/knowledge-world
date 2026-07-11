import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 部署在子路径 /knowledge-world/ 下时，base 确保 Vite 生成的 HTML 资源引用带正确前缀
// 开发环境仍走根路径 /
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [react()],
  publicDir: "../../assets",
  base: isProd ? "/knowledge-world/" : "/",
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
