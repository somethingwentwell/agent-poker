const SUIT_SYMBOL: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

export default function Card({
  card,
  size = "md",
}: {
  card: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const hidden = !card || card === "??";
  const rank = hidden ? "" : card[0] === "T" ? "10" : card[0];
  const suit = hidden ? "" : card[1];
  const red = suit === "h" || suit === "d";

  const dims =
    size === "lg"
      ? "w-8 h-11 text-sm sm:w-10 sm:h-14 sm:text-base md:w-12 md:h-16 md:text-lg"
      : size === "sm"
        ? "w-5 h-7 text-[8px] sm:w-7 sm:h-10 sm:text-[10px]"
        : size === "xs"
          ? "w-4 h-6 text-[7px] sm:w-5 sm:h-7 sm:text-[8px]"
          : "w-7 h-10 text-xs sm:w-9 sm:h-[3.25rem] sm:text-sm";

  if (hidden) {
    return (
      <div
        className={`${dims} rounded-md grid place-items-center shrink-0 border border-evo-blue/30`}
        style={{
          background:
            "repeating-linear-gradient(45deg,#2a4a7a,#2a4a7a 4px,#1e3558 4px,#1e3558 8px)",
        }}
        aria-label="hidden card"
      >
        <span className="text-evo-blue6/40 text-[8px] sm:text-[10px] font-bold">
          ?
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${dims} playing-card grid place-items-center font-bold leading-none shrink-0`}
      style={{ color: red ? "#c2293b" : "#16181a" }}
      aria-label={card}
    >
      <div className="flex flex-col items-center">
        <span>{rank}</span>
        <span>{SUIT_SYMBOL[suit]}</span>
      </div>
    </div>
  );
}
