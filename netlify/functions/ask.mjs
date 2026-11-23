// Site assistant with a hard guardrail.
// - 3 free questions per visitor (counted per IP per day in Netlify Blobs), then the form.
// - A question that names an address goes straight to the form, no model call.
// - Short answers about NYC permits only, from PLANS's own page text.
// - Daily cap across all visitors; the monthly spend cap is set on the Anthropic account.
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";

const FREE_PER_VISITOR = 3;
const SITE_DAILY_CAP = Number(process.env.ASSISTANT_DAILY_CAP || 300);
const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5-5";
const ADDR = /\b\d{1,5}[-\s]?\d{0,3}\s+[A-Za-z0-9 .'-]*(street|st\b|avenue|ave\b|road|rd\b|place|pl\b|boulevard|blvd|lane|ln\b|drive|dr\b|court|ct\b|parkway|pkwy|terrace|way)/i;

const SYSTEM = `You answer short questions on the PLANS Architecture website about New York City building permits.
Answer in at most three plain sentences, using only the facts below and general NYC DOB process knowledge.
Do not answer anything unrelated to NYC permits, renovations, Certificates of Occupancy, violations or PLANS's services; say politely that it is outside what you can help with.
Never give a firm price, schedule or legal conclusion for a specific building; say that PLANS reads the building's records first.
Do not add a sign-off or link; the page adds one.

Facts from PLANS's pages:
- PLANS files DOB permits for apartment renovations (Alt-2), Alt-COs and new Certificates of Occupancy, legalizations and violations, and commercial fit-outs.
- 117 DOB filings at 64 addresses since 2017. Typical DOB approval on an apartment renovation: 14 days after filing (median of 31 filings); about 48 days with a full plan review; changes after approval about 10 days.
- Starting prices: DOB filing, general construction, from $5,000; plumbing filing added on, $3,000; energy code filing added on, $2,000; existing conditions survey $1,000; existing conditions drawings $1,000; final inspection and Letter of Completion $1,000; change after approval $1,000; legalization records and feasibility study $5,000; professional certification for commercial tenants $5,000; sign permit $1,000; LPC Certificate of No Effect $2,500, Permit for Minor Work $1,500, Certificate of Appropriateness $7,500. New CO close-out is quoted per job. City filing fees are separate.
- Moving plumbing, gas or walls almost always needs a permit; paint and floors usually do not.
- Co-op and condo boards usually want the permit before work starts.`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the Netlify environment

export default async (req, context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let q = "";
  try { q = String((await req.json()).q || "").slice(0, 500).trim(); } catch {}
  if (!q) return Response.json({ error: "empty" }, { status: 400 });
  if (ADDR.test(q)) return Response.json({ gate: true, answer: "Happy to look at that building. Leave your name, email and the address and we'll read its records and reply." });

  const day = new Date().toISOString().slice(0, 10);
  const store = getStore("assistant-usage");
  const ip = context.ip || "unknown";
  const visitorKey = `${day}/${ip}`;
  const used = Number((await store.get(visitorKey)) || 0);
  const siteUsed = Number((await store.get(`${day}/_site`)) || 0);
  if (used >= FREE_PER_VISITOR || siteUsed >= SITE_DAILY_CAP) {
    return Response.json({ gate: true, answer: "You have used your free questions. Leave your name, email and property address and a person will answer the rest." });
  }
  await store.set(visitorKey, String(used + 1));
  await store.set(`${day}/_site`, String(siteUsed + 1));

  try {
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: q }],
    });
    if (msg.stop_reason === "refusal") {
      return Response.json({ answer: "That's outside what I can help with here. Ask about NYC permits, or leave your details and a person will reply." });
    }
    const answer = msg.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    return Response.json({ answer, left: FREE_PER_VISITOR - used - 1 });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "busy" }, { status: 503 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: "upstream" }, { status: 502 });
    throw err;
  }
};
