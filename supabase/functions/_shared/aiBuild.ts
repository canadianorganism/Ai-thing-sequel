// Server-side mirror of src/lib/aiBuild.ts. Kept self-contained so edge
// functions don't reach into the frontend tree.

export type AITier = 'copper' | 'diamond';

const COPPER_NOTICE = (label: string) =>
  `// ─── ${label} ───────────────────────────────────────────────\n` +
  `// This module is part of the Diamond tier and is not included in\n` +
  `// the Copper build. Upgrade to unlock dynamic difficulty, FPS/TPS\n` +
  `// aim assist, VR/XR adaptation, and voice replication.\n`;

function stripSection(source: string, headerSnippet: string, label: string): string {
  const escaped = headerSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    String.raw`^[ \t]*//[ \t]*─── ${escaped}[^\n]*\n([\s\S]*?)(?=^[ \t]*//[ \t]*─── |\Z)`,
    'm',
  );
  return source.replace(re, COPPER_NOTICE(label) + '\n');
}

const DIAMOND_MODIFIER_FIELDS = [
  'enemyDetectionRange',
  'enemyPathfindingSkill',
  'aimAssistStrength',
  'cameraRecoverySpeed',
  'verticalCombatScale',
  'navmeshPrecision',
];

function commentOutDiamondModifierFields(source: string): string {
  let out = source;
  for (const field of DIAMOND_MODIFIER_FIELDS) {
    const re = new RegExp(String.raw`^([ \t]*)(${field}\s*:[^\n]*)$`, 'gm');
    out = out.replace(re, '$1// [Diamond tier only] $2');
  }
  return out;
}

export function buildSourceForTier(fullSource: string, tier: AITier): string {
  if (tier === 'diamond') return fullSource;

  let copper = fullSource;
  copper = stripSection(copper, 'VOICE REPLICATION TYPES', 'VOICE REPLICATION (DIAMOND ONLY)');
  copper = commentOutDiamondModifierFields(copper);

  const banner =
    `/**\n` +
    ` * Universal Adaptive AI Engine — COPPER TIER BUILD\n` +
    ` *\n` +
    ` * Includes: any-language/any-engine plugin protocol, JSON transport,\n` +
    ` * enemy counter-AI, smart hints, HTTP & CLI server, zero dependencies.\n` +
    ` *\n` +
    ` * Diamond-only features (NOT included): dynamic difficulty curve,\n` +
    ` * FPS/TPS aim assist, VR/XR adaptation, voice replication.\n` +
    ` */\n\n`;
  return banner + copper;
}

export function getJSSource(fullSource: string): string {
  return fullSource
    .replace(/interface \w+ \{[^}]*\}/gs, '')
    .replace(/type \w+ =[^;]*;/g, '')
    .replace(/:\s*(string|number|boolean|void|any|null|undefined|Record<[^>]+>|Map<[^>]+>|Set<[^>]+>|Partial<[^>]+>|Readonly<[^>]+>|Required<[^>]+>|Omit<[^>]+>|Promise<[^>]+>|Float32Array|ArrayBuffer|VoiceProfile|VoiceSynthesisParams|VoiceEmotion|VoiceCadence|EmotionalRange|BreathingPattern|VoiceAnalysisOptions|PlayerProfile|GameEvent|GameFeature|FeatureCategory|AdaptiveModifiers|CounterStrategy|AdaptiveHint|StatRecommendation|CharacterDialogue|AdaptivePlugin|PlayerAction)(\[\])?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\bas\b\s+\w+/g, '')
    .replace(/\n\n\n+/g, '\n\n');
}

export function filenameForTier(tier: AITier, format: 'ts' | 'js' | 'exe'): string {
  const base = tier === 'diamond' ? 'adaptive-ai-diamond' : 'adaptive-ai-copper';
  return `${base}.${format}`;
}

export interface CopperBuildIssue {
  kind: 'voice_section_present' | 'diamond_field_active';
  detail: string;
}

export function verifyCopperBuild(copperSource: string): CopperBuildIssue[] {
  const issues: CopperBuildIssue[] = [];

  if (/^\s*\/\/\s*─── VOICE REPLICATION TYPES/m.test(copperSource)) {
    issues.push({ kind: 'voice_section_present', detail: 'Voice Replication section header still present.' });
  }
  if (/\b(VoiceProfile|VoiceSynthesisParams|VoiceCadence|EmotionalRange|BreathingPattern|VoiceAnalysisOptions|VoiceEmotion)\b/.test(copperSource)) {
    issues.push({ kind: 'voice_section_present', detail: 'Voice Replication identifier(s) still referenced.' });
  }
  for (const field of DIAMOND_MODIFIER_FIELDS) {
    const re = new RegExp(String.raw`^[ \t]*${field}\s*:`, 'm');
    if (re.test(copperSource)) {
      issues.push({ kind: 'diamond_field_active', detail: `Diamond field '${field}' is not commented out.` });
    }
  }
  return issues;
}
