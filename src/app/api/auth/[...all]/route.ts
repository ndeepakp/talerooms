import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { guardedAuthHandler } from "@/lib/auth-handler";

const handlers = toNextJsHandler(auth);
export const GET = guardedAuthHandler(handlers.GET);
export const POST = guardedAuthHandler(handlers.POST);
