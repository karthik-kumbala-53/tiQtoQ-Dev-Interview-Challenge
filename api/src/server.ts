import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { analyseChange } from "./analyse-change.js";

const port = 4000;

createServer(async (request: IncomingMessage, response: ServerResponse) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/analyse") {
    response.writeHead(404).end();
    return;
  }

  try {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }

    const data = JSON.parse(body) as { description?: unknown };
    const description = data.description;

    if (typeof description !== "string" || !description.trim()) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Please enter a change description." }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(analyseChange(description)));
  } catch {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "The request could not be analysed." }));
  }
}).listen(port, () => console.log(`API running at http://localhost:${port}`));
