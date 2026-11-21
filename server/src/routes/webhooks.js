import { Hono } from "hono";
import { stripeWebhook } from "../controllers/webhooks/stripe.js";

const webhooksRouter = new Hono();

webhooksRouter.post("/stripe", stripeWebhook);

export { webhooksRouter };
