import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive profanity word list (lowercase, common slurs and swear words)
const BLOCKED_WORDS = [
  // Common profanity
  "fuck", "shit", "ass", "asshole", "bitch", "bastard", "damn", "dick",
  "piss", "crap", "cock", "cunt", "whore", "slut", "prick",
  // Racial/ethnic slurs
  "nigger", "nigga", "chink", "spic", "kike", "wetback", "gook",
  "beaner", "towelhead", "raghead", "redskin", "coon",
  // Homophobic slurs
  "faggot", "fag", "dyke", "tranny",
  // Other slurs & offensive terms
  "retard", "retarded", "mongoloid",
  // Common evasions
  "f u c k", "s h i t", "b i t c h", "n i g g e r", "f a g",
  "stfu", "gtfo", "lmfao",
];

// Build regex patterns that catch leetspeak and character substitution
function buildPattern(word: string): RegExp {
  const leetMap: Record<string, string> = {
    a: "[a@4àáâãäå]",
    b: "[b8]",
    c: "[ck¢©]",
    e: "[e3èéêë€]",
    g: "[g9]",
    i: "[i1!|ìíîï]",
    l: "[l1|]",
    o: "[o0òóôõö]",
    s: "[s$5]",
    t: "[t7+]",
    u: "[uùúûü]",
    z: "[z2]",
  };

  const pattern = word
    .split("")
    .map((ch) => {
      if (ch === " ") return "\\s+";
      return leetMap[ch] || ch;
    })
    .join("[\\s._\\-*]*"); // Allow separators between chars

  // Use lookahead/behind for word boundaries that work with character classes
  return new RegExp(`(?:^|[^a-zA-Z])${pattern}`, "i");
}

const PATTERNS = BLOCKED_WORDS.map((w) => buildPattern(w));

function containsProfanity(text: string): { blocked: boolean; reason?: string } {
  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase();

  for (let i = 0; i < PATTERNS.length; i++) {
    if (PATTERNS[i].test(normalized)) {
      return { blocked: true, reason: "Your comment contains inappropriate language. Please revise it." };
    }
  }
  return { blocked: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, display_name } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid text field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check both comment and display name
    const commentCheck = containsProfanity(text);
    if (commentCheck.blocked) {
      return new Response(
        JSON.stringify({ blocked: true, reason: commentCheck.reason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (display_name && typeof display_name === "string") {
      const nameCheck = containsProfanity(display_name);
      if (nameCheck.blocked) {
        return new Response(
          JSON.stringify({ blocked: true, reason: "Your display name contains inappropriate language. Please choose a different name." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ blocked: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
