import { Hono } from "hono";
import { startCheckout, viewInvoice } from "../controllers/invoices/public.js";

const publicInvoiceRouter = new Hono();

publicInvoiceRouter.get("/", viewInvoice);
publicInvoiceRouter.post("/checkout", startCheckout);

export { publicInvoiceRouter };
