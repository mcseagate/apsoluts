import { connectDb } from "../../config/db.js";
import { Subscriber } from "../../models/Subscriber.js";

export async function listSubscribers(c) {
  // Authorization check
  const authHeader = c.req.header("Authorization");
  if (!authHeader || authHeader !== "Bearer apsoluts-admin-session-token") {
    return c.json({
      error: {
        message: "Unauthorized access.",
        code: "UNAUTHORIZED"
      }
    }, 401);
  }

  await connectDb();

  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.max(1, Number(c.req.query("limit") || 10));
  const search = (c.req.query("search") || "").trim();

  const query = {};
  if (search) {
    query.email = { $regex: search, $options: "i" };
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
