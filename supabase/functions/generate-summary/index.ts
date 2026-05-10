import { createFunctionLogger } from "../_shared/logger.ts";

function healthResponse() {
  return new Response(
    JSON.stringify({
      status: "ok",
      function: "generate-summary",
      ready: false,
      retired: true,
      replacement: "dispatch-lenses"
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
}

Deno.serve(async (req) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = createFunctionLogger("generate-summary", requestId);

  if (req.method === "GET") {
    return healthResponse();
  }

  logger.warn("Rejected retired generate-summary invocation", {
    replacement: "dispatch-lenses"
  });

  return new Response(
    JSON.stringify({
      error: "generate-summary is retired. Use dispatch-lenses.",
      request_id: requestId
    }),
    {
      status: 410,
      headers: { "content-type": "application/json" }
    }
  );
});
