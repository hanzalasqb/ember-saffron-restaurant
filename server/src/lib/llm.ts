// Minimal OpenAI-compatible client: JSON-mode completions and streaming with tool calls.
export interface ToolCall { id: string; name: string; arguments: string }
export type LLMEvent = { type: "token"; text: string } | { type: "tool_calls"; calls: ToolCall[] };
export interface LLM {
  enabled: boolean;
  json(system: string, user: string): Promise<unknown>;
  stream(messages: unknown[], tools?: unknown[]): AsyncIterable<LLMEvent>;
}

export function createLLM(baseUrl: string, apiKey: string, model: string): LLM {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  return {
    enabled: Boolean(apiKey),
    async json(system, user) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST", headers, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`LLM error ${res.status}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return JSON.parse(data.choices[0].message.content);
    },
    async *stream(messages, tools) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST", headers, signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({ model, temperature: 0.3, stream: true, messages, ...(tools ? { tools } : {}) }),
      });
      if (!res.ok || !res.body) throw new Error(`LLM error ${res.status}`);
      const calls = new Map<number, ToolCall>();
      const decoder = new TextDecoder();
      let buffer = "";
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          const delta = JSON.parse(data).choices?.[0]?.delta ?? {};
          if (delta.content) yield { type: "token", text: delta.content };
          for (const tc of delta.tool_calls ?? []) {
            const slot = calls.get(tc.index ?? 0) ?? { id: "", name: "", arguments: "" };
            slot.id = tc.id ?? slot.id;
            slot.name += tc.function?.name ?? "";
            slot.arguments += tc.function?.arguments ?? "";
            calls.set(tc.index ?? 0, slot);
          }
        }
      }
      if (calls.size) yield { type: "tool_calls", calls: [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c) };
    },
  };
}
