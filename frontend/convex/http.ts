import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { webhook } from "./grading";

const http = httpRouter();

auth.addHttpRoutes(http);

// Add grading webhook route
http.route({
  path: "/grading/webhook",
  method: "POST",
  handler: webhook,
});

export default http;
