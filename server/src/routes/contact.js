import { Hono } from "hono";
import { submitContact } from "../controllers/contact/submitContact.js";

const contactRouter = new Hono();

contactRouter.post("/", submitContact);

export { contactRouter };
