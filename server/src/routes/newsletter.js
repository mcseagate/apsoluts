import { Hono } from "hono";
import { subscribe } from "../controllers/newsletter/subscribe.js";
import { listSubscribers } from "../controllers/newsletter/list.js";
import { unsubscribe } from "../controllers/newsletter/unsubscribe.js";

const newsletterRouter = new Hono();

newsletterRouter.post("/", subscribe);
newsletterRouter.get("/", listSubscribers);
newsletterRouter.post("/unsubscribe", unsubscribe);

export { newsletterRouter };
