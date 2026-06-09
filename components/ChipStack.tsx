/** CSS chip discs — not from the card sprite sheet. */

export function ChipDisc({
  className = "",
  tone = "gold",
}: {
  className?: string;
  tone?: "gold" | "white" | "red";
}) {
  const toneClass =
    tone === "white"
      ? "chip-disc-white"
      : tone === "red"
        ? "chip-disc-red"
        : "chip-disc-gold";
  return <span className={`chip-disc ${toneClass} ${className}`} />;
}

export default function ChipStack({
  size = "md",
  tone = "gold",
}: {
  size?: "sm" | "md";
  tone?: "gold" | "white" | "red";
}) {
  const disc =
    size === "sm" ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3 sm:w-3.5 sm:h-3.5";
  const h = size === "sm" ? "h-3.5 sm:h-4" : "h-4 sm:h-5";
  const w = size === "sm" ? "w-3.5 sm:w-4" : "w-4 sm:w-5";

  return (
    <span className={`relative inline-block shrink-0 ${w} ${h}`} aria-hidden>
      <ChipDisc
        tone={tone}
        className={`absolute left-1/2 -translate-x-1/2 top-0 ${disc} opacity-70`}
      />
      <ChipDisc
        tone={tone}
        className={`absolute left-1/2 -translate-x-1/2 top-[3px] sm:top-1 ${disc} opacity-85`}
      />
      <ChipDisc
        tone={tone}
        className={`absolute left-1/2 -translate-x-1/2 top-[6px] sm:top-2 ${disc}`}
      />
    </span>
  );
}

export function DealerButton({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`dealer-button grid place-items-center font-bold shadow ${
        compact
          ? "w-4 h-4 text-[8px] -top-1.5 -right-1.5"
          : "w-5 h-5 sm:w-6 sm:h-6 text-[9px] sm:text-xs -top-1.5 -right-1.5 sm:-top-2 sm:-right-2"
      } absolute rounded-full`}
    >
      D
    </span>
  );
}
