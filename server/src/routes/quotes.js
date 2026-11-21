import { Hono } from "hono";
import { submitQuote } from "../controllers/quotes/submit.js";

const quotesRouter = new Hono();

quotesRouter.post("/", submitQuote);

export { quotesRouter };
