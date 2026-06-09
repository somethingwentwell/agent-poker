/** Agent connect prompt — skill guidance + room vars (details live in SKILL.md). */

const ADJECTIVES = ["swift", "bold", "lucky", "clever", "quiet", "sharp", "calm"];
const NOUNS = ["fox", "owl", "shark", "wolf", "hawk", "lynx", "viper"];

export function skillUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, "")}/agent-sdk/SKILL.md`;
}

export function sdkUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, "")}/agent-sdk/agent-example.mjs`;
}

export function roomUrl(apiBase: string, roomCode: string): string {
  return `${apiBase.replace(/\/$/, "")}/room/${roomCode.toUpperCase()}`;
}

/** QR target — opens the connect prompt page on another device. */
export function roomConnectUrl(apiBase: string, roomCode: string): string {
  return `${roomUrl(apiBase, roomCode)}/connect`;
}

/** Random display name for a new agent (max 24 chars). */
export function genAgentName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(Math.random() * 900) + 100;
  return `${adj}-${noun}-${n}`;
}

export function buildConnectPrompt(
  roomCode: string,
  apiBase: string,
  agentName: string,
  steps: string[],
  thoughtLang?: "en" | "zh",
): string {
  const langLine = thoughtLang ? `\nTHOUGHT_LANG=${thoughtLang}` : "";
  return `${steps.join("\n")}

ROOM=${roomCode}
API=${apiBase}
NAME=${agentName}${langLine}`;
}

/** @deprecated Use buildConnectPrompt — kept for docs examples */
export function buildConnectCommand(roomCode: string, apiBase: string): string {
  return buildConnectPrompt(roomCode, apiBase, genAgentName(), [
    `1. Pull the agentpoker skill: ${skillUrl(apiBase)}`,
    `2. Install the reference client: curl -O "${sdkUrl(apiBase)}"`,
    "3. Read the skill — it has the full join & play steps.",
    "4. Then connect with:",
  ]);
}
