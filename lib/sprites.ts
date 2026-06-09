// Avatar helpers. 56 sliced sprites at /sprites/000.png .. /sprites/055.png
export const AVATAR_COUNT = 56;

export function avatarSrc(index: number): string {
  const i = ((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return `/sprites/${String(i).padStart(3, "0")}.png`;
}
