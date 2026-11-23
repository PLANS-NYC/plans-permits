// "Start my project" form: adds one lead row to Airtable (Projects table, 03_PIPELINE),
// where the Lead Pipeline run picks it up. This function sends no email.
// Netlify environment variables: AIRTABLE_TOKEN (write access to that base only),
// AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, and AIRTABLE_FIELDS, a JSON map from the
// form keys below to the table's field names.
const KEYS = ["name", "email", "phone", "address", "goal", "type", "role", "when"];

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.company) return Response.json({ ok: true }); // honeypot: bots fill the hidden field
  const clean = Object.fromEntries(KEYS.map((k) => [k, String(body[k] || "").trim().slice(0, 2000)]));
  if (!clean.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean.email) || !clean.address || !clean.goal) {
    return Response.json({ error: "missing" }, { status: 400 });
  }
  const map = JSON.parse(process.env.AIRTABLE_FIELDS || "{}");
  const fields = {};
  for (const k of KEYS) if (map[k] && clean[k]) fields[map[k]] = clean[k];
  if (map.source) fields[map.source] = "permits.plans.nyc";

  const res = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) return Response.json({ error: "save" }, { status: 502 });
  return Response.json({ ok: true });
};
