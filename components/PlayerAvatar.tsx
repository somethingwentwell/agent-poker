import { avatarEmoji } from "@/lib/avatars";

export default function PlayerAvatar({
  avatar,
  compact = false,
}: {
  avatar: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center rounded-full bg-evo-gray11/30 border border-evo-gray11/50 shrink-0 ${
        compact
          ? "w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl"
          : "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-2xl sm:text-3xl"
      }`}
      aria-hidden
    >
      {avatarEmoji(avatar)}
    </div>
  );
}
