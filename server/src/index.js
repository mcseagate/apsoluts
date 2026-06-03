import { Hono } from "hono";
import { cors } from "hono/cors";
import { contactRouter } from "./routes/contact.js";
import { newsletterRouter } from "./routes/newsletter.js";
import { authRouter } from "./routes/auth.js";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

const app = new Hono();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/(www\.)?apsoluts\.com$/,
  /^https:\/\/.*\.vercel\.app$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Global error handler
app.onError((err, c) => {
  console.error("[Hono Server Error]:", err);
  return c.json({ error: { message: err.message || "Internal Server Error", code: "INTERNAL_SERVER_ERROR" } }, 500);
});

const port = Number(process.env.PORT) || 3000;

// Root endpoint for browser access
app.get("/", (c) => c.text("Apex Root Solutions API is running on port " + port));

// Routes
app.route("/api/contact", contactRouter);
app.route("/api/newsletter", newsletterRouter);
app.route("/api/auth", authRouter);

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
