const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const count = Number(body.count);
    if (!topic || topic.length > 100) return json({ error: "Topic must be 1-100 characters." }, 400);
    if (!Number.isInteger(count) || count < 5 || count > 15) return json({ error: "Count must be 5-15." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured." }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        store: false,
        instructions:
          "You list real, published Morrowind mods that work with OpenMW (Lua or content mods), as found on Nexus Mods. Only include mods you are confident exist. Give each a short factual 1-2 sentence summary of its content. No code.",
        input: `Topic: ${topic}\nList ${count} mods.`,
        text: {
          format: {
            type: "json_schema",
            name: "mod_list",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["mods"],
              properties: {
                mods: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "summary"],
                    properties: { name: { type: "string" }, summary: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      if (res.status === 429) return json({ error: "Too many requests, please wait a moment and try again." }, 429);
      if (res.status === 402) return json({ error: "AI credits are used up. Please add credits to continue." }, 402);
      return json({ error: "Could not generate the list.", details: t }, res.status);
    }
    const data = await res.json();
    const text =
      data.output_text ??
      data.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "output_text")?.text;
    const parsed = JSON.parse(text);
    return json({ mods: parsed.mods ?? [] });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
