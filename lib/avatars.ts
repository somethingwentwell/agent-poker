/** Player face — emoji picked deterministically from avatar id. */

export const FACE_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉",
  "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛",
  "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
  "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😵",
  "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐",
] as const;

export const AVATAR_COUNT = FACE_EMOJIS.length;

export function avatarEmoji(avatar: number): string {
  const i = ((avatar % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return FACE_EMOJIS[i];
}
