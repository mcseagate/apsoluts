import { Hono } from "hono";
import { subscribe } from "../controllers/newsletter/subscribe.js";
import { listSubscribers } from "../controllers/newsletter/list.js";

const newsletterRouter = new Hono();

newsletterRouter.post("/", subscribe);
newsletterRouter.get("/", listSubscribers);

export { newsletterRouter };
