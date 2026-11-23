# permits.plans.nyc

The PLANS permits site: one static page in `site/` plus two small Netlify functions.

- `site/index.html`: homepage, DOB Permit, Alt-CO, legalization, commercial, trade, Ask and Start pages (hash links). Schema.org markup, `robots.txt`, `sitemap.xml` and `llms.txt` are there for AI search.
- `netlify/functions/ask.mjs`: the site assistant. 3 free questions per visitor per day, then the form. A question with an address goes straight to the form. Short answers about NYC permits only. A daily cap applies across all visitors.
- `netlify/functions/intake.mjs`: the Start form. Adds one lead row to the Airtable Projects table (Drive Category 03_PIPELINE, Status Discovery, Waiting On Me, details in Next Action). It sends no email.

## Netlify settings (Site configuration, Environment variables)

| Variable | What |
|---|---|
| `ANTHROPIC_API_KEY` | Key from a separate workspace with a monthly spend limit set in the Claude Console |
| `ASSISTANT_MODEL` | Optional. Defaults to `claude-opus-5-5` |
| `ASSISTANT_DAILY_CAP` | Optional. Questions per day across the whole site, default 300 |
| `AIRTABLE_TOKEN` | Personal access token, scope data.records:write, access to the PLANS Projects base only |
| `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID` | Optional. Default to the Projects table (`apprkIjj6tsyzZH0e` / `tblyXgBIxZK3fZAYZ`) |

## Launch (only with Daniel's OK)

1. Connect this repository in Netlify (Add new site, Import from GitHub). The publish folder and functions come from `netlify.toml`.
2. Set the environment variables above.
3. In Netlify, add the custom domain `permits.plans.nyc`.
4. Where plans.nyc's DNS is managed, add one CNAME record: `permits` pointing to the Netlify site address.
5. Submit the sitemap in Bing Webmaster Tools and Google Search Console.
