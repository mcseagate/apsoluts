import { Hono } from "hono";
import { login } from "../controllers/auth/login.js";

const authRouter = new Hono();

authRouter.post("/login", login);

export { authRouter };
