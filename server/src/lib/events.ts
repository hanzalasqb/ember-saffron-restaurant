import { EventEmitter } from "node:events";
import type { Response } from "express";

/** In-process pub/sub for live order updates (swap for Redis/Postgres LISTEN when running several instances). */
export const bus = new EventEmitter();
bus.setMaxListeners(500);

export function sse(res: Response) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no", Connection: "keep-alive" });
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
  res.on("close", () => clearInterval(ping));
  return (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
