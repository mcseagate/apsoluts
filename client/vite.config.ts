import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { headTags, seoPages } from "./src/data/seo";

// Crawlers such as Facebook's link preview read the raw HTML and do not run
// JavaScript, so a page that sets its own title and social tags in React would
// share the home page's. After the build, write a copy of index.html for each page
// in src/data/seo.ts with that page's tags in <head>. Vercel serves a real file
// before it applies the single-page-app rewrite, so /app-development gets its
// own head and then boots the same app.
function pageHeads(): Plugin {
  const strip = [
    /<title>[\s\S]*?<\/title>\s*/,
    /<meta\s+name="description"[^>]*>\s*/,
    /<meta\s+property="og:[^"]*"[^>]*>\s*/g,
    /<meta\s+name="twitter:[^"]*"[^>]*>\s*/g,
  ];
  return {
    name: "page-heads",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const base = fs.readFileSync(path.join(dist, "index.html"), "utf8");
      for (const page of seoPages) {
        let html = base;
        for (const re of strip) html = html.replace(re, "");
        html = html.replace("</head>", `  ${headTags(page)}\n</head>`);
        const dir = path.join(dist, page.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
    allowedHosts: true, // Allow all hosts
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    pageHeads(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
