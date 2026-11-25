import { Hono } from "hono";
import { subscribe } from "../controllers/newsletter/subscribe.js";
import { listSubscribers } from "../controllers/newsletter/list.js";
import { confirm } from "../controllers/newsletter/confirm.js";
import { unsubscribe } from "../controllers/newsletter/unsubscribe.js";

const newsletterRouter = new Hono();

newsletterRouter.post("/", subscribe);
newsletterRouter.get("/", listSubscribers);
newsletterRouter.post("/confirm", confirm);
newsletterRouter.post("/unsubscribe", unsubscribe);

export { newsletterRouter };
