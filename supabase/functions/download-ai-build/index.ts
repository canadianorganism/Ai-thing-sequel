import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ADAPTIVE_AI_SOURCE } from "../_shared/adaptiveAISource.ts";
import {
  buildSourceForTier,
  filenameForTier,
  getJSSource,
  verifyCopperBuild,
  type AITier,
} from "../_shared/aiBuild.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Format = "ts" | "js" | "exe";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;
    if (!user.email_confirmed_at) return json({ error: "Email not verified" }, 403);

    const body = await req.json().catch(() => ({}));
    const format = (body?.format ?? "ts") as Format;
    if (format !== "ts" && format !== "js" && format !== "exe") {
      return json({ error: "format must be ts, js, or exe" }, 400);
    }

    // Look up entitlement using the service role so we can't be tricked
    // by a client that strips RLS-readable rows.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: ent, error: entErr } = await admin
      .from("ai_entitlements")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();
    if (entErr) {
      console.error("entitlement lookup failed", entErr);
      return json({ error: "Could not verify entitlement" }, 500);
    }
    if (!ent) return json({ error: "No active license. Activate a tier first." }, 402);

    const tier = ent.tier as AITier;

    // Build the source for this tier.
    const tsSource = buildSourceForTier(ADAPTIVE_AI_SOURCE, tier);
    const jsSource = buildSourceForTier(getJSSource(ADAPTIVE_AI_SOURCE), tier);

    // Server-side verification: for Copper, every payload we hand out must
    // be free of Diamond-only sections. If verification fails, refuse to
    // serve the file — better an error than a leak.
    if (tier === "copper") {
      const issues = [...verifyCopperBuild(tsSource), ...verifyCopperBuild(jsSource)];
      if (issues.length > 0) {
        console.error("Copper build verification failed", issues);
        return json(
          {
            error: "Copper build verification failed on the server. Download blocked.",
            issues,
          },
          500,
        );
      }
    }

    const filename = filenameForTier(tier, format);
    const contents = format === "ts" ? tsSource : jsSource;
    const mime =
      format === "exe"
        ? "application/octet-stream"
        : format === "js"
          ? "application/javascript"
          : "application/typescript";

    return new Response(contents, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-AI-Tier": tier,
      },
    });
  } catch (err) {
    console.error("download-ai-build error", err);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
