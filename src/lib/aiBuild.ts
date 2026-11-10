/**
 * Tier-scoped download builders for the Universal Adaptive AI Engine.
 *
 * - Diamond build: full source, every feature.
 * - Copper build: source with Diamond-only modules removed at the section
 *   boundaries the source file already declares (Voice Replication types,
 *   3D-specific modifiers, aim assist, VR/XR helpers, dynamic difficulty
 *   curve). Removed sections are replaced with a clear notice so consumers
 *   understand the licensing boundary.
 */

import type { AITier } from './entitlements';

const COPPER_NOTICE = (label: string) =>
  `// ─── ${label} ───────────────────────────────────────────────\n` +
  `// This module is part of the Diamond tier and is not included in\n` +
  `// the Copper build. Upgrade to unlock dynamic difficulty, FPS/TPS\n` +
  `// aim assist, VR/XR adaptation, and voice replication.\n`;

/** Remove a section that starts at a known header and runs until the next "// ─── " header. */
function stripSection(source: string, headerSnippet: string, label: string): string {
  // Match the header line plus everything until the next "// ─── " block header
  // (or end of file). Headers in this file look like: `// ─── NAME ───…`
  const escaped = headerSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    String.raw`^[ \t]*//[ \t]*─── ${escaped}[^\n]*\n([\s\S]*?)(?=^[ \t]*//[ \t]*─── |\Z)`,
    'm',
  );
  return source.replace(re, COPPER_NOTICE(label) + '\n');
}

/**
 * Diamond-only modifier fields that live inside the AdaptiveModifiers
 * interface. We replace them with stubs that return safe constants so the
 * Copper build still type-checks if consumers reference them.
 */
const DIAMOND_MODIFIER_FIELDS = [
  'enemyDetectionRange',
  'enemyPathfindingSkill',
  'aimAssistStrength',
  'cameraRecoverySpeed',
  'verticalCombatScale',
  'navmeshPrecision',
];

function commentOutDiamondModifierFields(source: string): string {
  // Comment out each Diamond-tier field declaration inside the AdaptiveModifiers interface.
  let out = source;
  for (const field of DIAMOND_MODIFIER_FIELDS) {
    const re = new RegExp(
      String.raw`^([ \t]*)(${field}\s*:[^\n]*)$`,
      'gm',
    );
    out = out.replace(re, '$1// [Diamond tier only] $2');
  }
  return out;
}

/**
 * Build the source string for a given tier. Pass the full source as input.
 */
export function buildSourceForTier(fullSource: string, tier: AITier): string {
  if (tier === 'diamond') return fullSource;

  let copper = fullSource;
  copper = stripSection(copper, 'VOICE REPLICATION TYPES', 'VOICE REPLICATION (DIAMOND ONLY)');
  copper = commentOutDiamondModifierFields(copper);

  // Prepend a tier banner so the file is self-describing.
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

export interface CopperBuildIssue {
  kind: 'voice_section_present' | 'diamond_field_active';
  detail: string;
}

/**
 * Inspect a Copper build and report any Diamond-only content that wasn't
 * stripped. Returns an empty array when the build is clean.
 *
 * Checks:
 *   1. The Voice Replication section header is gone (or replaced with the
 *      Copper notice).
 *   2. None of the Diamond modifier fields appear as active (uncommented)
 *      declarations.
 */
export function verifyCopperBuild(copperSource: string): CopperBuildIssue[] {
  const issues: CopperBuildIssue[] = [];

  if (/^\s*\/\/\s*─── VOICE REPLICATION TYPES/m.test(copperSource)) {
    issues.push({
      kind: 'voice_section_present',
      detail: 'Voice Replication section header still present in Copper build.',
    });
  }
  // Catch any lingering voice-replication identifiers too.
  if (/\b(VoiceProfile|VoiceSynthesisParams|VoiceCadence|EmotionalRange|BreathingPattern|VoiceAnalysisOptions|VoiceEmotion)\b/.test(copperSource)) {
    issues.push({
      kind: 'voice_section_present',
      detail: 'Voice Replication identifier(s) still referenced in Copper build.',
    });
  }

  for (const field of DIAMOND_MODIFIER_FIELDS) {
    // An "active" declaration is `<field>:` not preceded by `//` on the same line.
    const re = new RegExp(String.raw`^[ \t]*${field}\s*:`, 'm');
    if (re.test(copperSource)) {
      issues.push({
        kind: 'diamond_field_active',
        detail: `Diamond modifier field '${field}' is not commented out.`,
      });
    }
  }

  return issues;
}

export class CopperBuildVerificationError extends Error {
  issues: CopperBuildIssue[];
  constructor(issues: CopperBuildIssue[]) {
    super(`Copper build verification failed: ${issues.map((i) => i.detail).join('; ')}`);
    this.name = 'CopperBuildVerificationError';
    this.issues = issues;
  }
}

export function filenameForTier(tier: AITier, format: 'ts' | 'js' | 'exe'): string {
  const base = tier === 'diamond' ? 'adaptive-ai-diamond' : 'adaptive-ai-copper';
  return `${base}.${format}`;
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
