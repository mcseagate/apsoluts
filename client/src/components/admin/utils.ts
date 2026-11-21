import { toast } from "sonner";
import { ApiError } from "@/lib/api";

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export const errorMessage = (err: unknown) => (err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
export const toastError = (err: unknown) => toast.error(errorMessage(err));

// Whole-dollar-and-cents amounts as typed; the server is the authority on what is valid.
export const MONEY_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;
