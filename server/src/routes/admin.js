import { Hono } from "hono";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as b from "../controllers/admin/billing.js";
import * as camp from "../controllers/admin/campaigns.js";

const adminRouter = new Hono();

// Nothing below is reachable without a valid administrator token.
adminRouter.use("*", requireAdmin);

adminRouter.get("/billing/status", b.getBillingStatus);

adminRouter.get("/quotes", b.listQuotes);
adminRouter.get("/quotes/:id", b.getQuote);
adminRouter.patch("/quotes/:id", b.updateQuote);
adminRouter.post("/quotes/:id/convert", b.convertQuote);

adminRouter.get("/projects", b.listProjects);
adminRouter.get("/projects/:id", b.getProjectDetail);
adminRouter.patch("/projects/:id", b.patchProject);
adminRouter.post("/projects/:id/accept", b.acceptProject);
adminRouter.delete("/projects/:id/accept", b.unacceptProject);
adminRouter.post("/projects/:id/close", b.closeProjectRoute);
adminRouter.post("/projects/:id/invoices", b.createInvoiceDraft);

adminRouter.get("/invoices", b.listInvoices);
adminRouter.get("/invoices/:id", b.getInvoiceDetail);
adminRouter.patch("/invoices/:id", b.patchInvoice);
adminRouter.delete("/invoices/:id", b.removeInvoiceDraft);
adminRouter.post("/invoices/:id/issue", b.issue);
adminRouter.post("/invoices/:id/void", b.voidRoute);
adminRouter.post("/invoices/:id/reissue", b.reissue);
adminRouter.post("/invoices/:id/send", b.sendInvoice);
adminRouter.post("/invoices/:id/link/rotate", b.rotateLinkRoute);
adminRouter.post("/invoices/:id/link/disable", b.disableLinkRoute);

adminRouter.get("/campaigns/status", camp.campaignStatus);
adminRouter.get("/campaigns/preview", camp.previewCampaign);
adminRouter.post("/campaigns/test-send", camp.testSendCampaign);
adminRouter.get("/campaigns/history", camp.campaignHistory);

export { adminRouter };
