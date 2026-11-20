import { connectDb } from "../../config/db.js";
import { Subscriber } from "../../models/Subscriber.js";
import { bearerToken, verifyToken } from "../../lib/adminAuth.js";

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listSubscribers(c) {
  // Authorization check
  if (!verifyToken(bearerToken(c.req.header("Authorization")))) {
    return c.json({
      error: {
        message: "Unauthorized access.",
        code: "UNAUTHORIZED"
      }
    }, 401);
  }

  await connectDb();

  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 10)));
  const search = (c.req.query("search") || "").trim();

  const query = {};
  if (search) {
    query.email = { $regex: escapeRegExp(search), $options: "i" };
  }

  try {
    const totalCount = await Subscriber.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return c.json({
      data: {
        subscribers,
        totalCount,
        page,
        limit,
        totalPages
      }
    });
  } catch (err) {
    console.error("[Newsletter] Failed to fetch subscribers:", err);
    return c.json({
      error: {
        message: "Failed to load subscribers list.",
        code: "DATABASE_ERROR"
      }
    }, 500);
  }
}
