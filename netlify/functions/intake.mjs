// "Start my project" form: adds one lead row to the Airtable Projects table
// (base apprkIjj6tsyzZH0e, Drive Category 03_PIPELINE, Waiting On Me).
// This function sends no email. Netlify environment variable: AIRTABLE_TOKEN,
// a personal access token with write access to that base only.
// Optional overrides: AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID.
const BASE = process.env.AIRTABLE_BASE_ID || "apprkIjj6tsyzZH0e";
const TABLE = process.env.AIRTABLE_TABLE_ID || "tblyXgBIxZK3fZAYZ";
const F = {
  projectName: "fldGfFKkYXrALwxiZ",
  status: "flddj1tjfAw7o4Ud4",
  waitingOn: "fldQjnIpt8JEceQ4M",
  nextAction: "fld3Yx2tzMnhILjmh",
  lastContact: "fldjj4yEchALr2TKl",
  ownerName: "fldghYUO7AogdogiH",
  ownerEmail: "fldp26hz7Bhkz73cN",
  driveCategory: "fld8UahsQha8NGc1G",
};
const KEYS = ["name", "email", "phone", "address", "goal", "type", "role", "when"];

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.company) return Response.json({ ok: true }); // honeypot: bots fill the hidden field
  const c = Object.fromEntries(KEYS.map((k) => [k, String(body[k] || "").replace(/\s+/g, " ").trim().slice(0, 1000)]));
  if (!c.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email) || !c.address || !c.goal) {
    return Response.json({ error: "missing" }, { status: 400 });
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const details = [
    `Web lead from permits.plans.nyc, ${today}. Reply with the first information request.`,
    `Property: ${c.address}`,
    `Goal: ${c.goal}`,
    c.type && `Project type: ${c.type}`,
    c.role && `Role: ${c.role}`,
    c.when && `Timing: ${c.when}`,
    c.phone && `Phone: ${c.phone}`,
  ].filter(Boolean).join("\n");

  const fields = {
    [F.projectName]: c.name.toUpperCase().slice(0, 100),
    [F.status]: "Discovery",
    [F.waitingOn]: "Me",
    [F.driveCategory]: "03_PIPELINE",
    [F.ownerName]: c.name,
    [F.ownerEmail]: c.email,
    [F.lastContact]: today,
    [F.nextAction]: details,
  };

  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }] }),
  });
  if (!res.ok) {
    console.error("airtable", res.status, (await res.text()).slice(0, 300));
    return Response.json({ error: "save" }, { status: 502 });
  }
  return Response.json({ ok: true });
};
