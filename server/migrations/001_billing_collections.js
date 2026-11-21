import { AuditEntry } from "../src/models/AuditEntry.js";
import { Counter } from "../src/models/Counter.js";
import { Invoice } from "../src/models/Invoice.js";
import { Payment } from "../src/models/Payment.js";
import { PaymentEvent } from "../src/models/PaymentEvent.js";
import { Project } from "../src/models/Project.js";
import { QuoteRequest } from "../src/models/QuoteRequest.js";

// Creates the billing collections and their indexes. The ones that carry
// guarantees:
//   paymentevents.eventId         unique: a provider event is applied once
//   payments.checkoutSessionId    unique: one row per checkout session
//   invoices.number               unique: no two invoices share a number
//   invoices.milestoneId          unique where active: one live invoice per milestone
export const description = "Billing collections and indexes";

export async function up() {
  for (const model of [QuoteRequest, Project, Invoice, Payment, PaymentEvent, AuditEntry, Counter]) {
    await model.createCollection().catch((err) => {
      if (err?.codeName !== "NamespaceExists" && err?.code !== 48) throw err;
    });
    await model.createIndexes();
  }
}
