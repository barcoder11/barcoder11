// Grants the admin role to an existing Pawtopia account (sign in once first).
// Usage: node --env-file=.env.local scripts/grant-admin.mjs you@example.com [admin|editor]
import { createClient } from "@supabase/supabase-js";

const [email, role = "admin"] = process.argv.slice(2);
if (!email || !["admin", "editor"].includes(role)) {
  console.error("Usage: node --env-file=.env.local scripts/grant-admin.mjs <email> [admin|editor]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

let user;
for (let page = 1; !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No account for ${email}. Sign in to the app once with that email, then re-run.`);
  process.exit(1);
}
const { error } = await supabase.from("app_roles").upsert({ user_id: user.id, role, granted_by: "grant-admin script" });
if (error) throw error;
console.log(`✓ ${email} is now ${role}. Visit /admin.`);
