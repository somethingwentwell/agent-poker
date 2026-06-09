"use client";

import { useI18n } from "@/components/LocaleProvider";
import { useIsMobile } from "@/hooks/useMediaQuery";
import Card from "./Card";
import ChipStack from "./ChipStack";
import Seat, { SeatPlayer } from "./Seat";

function seatStyle(
  i: number,
  n: number,
  compact: boolean,
): React.CSSProperties {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  const rx = compact ? 34 : 46;
  const ry = compact ? 30 : 40;
  const x = 50 + rx * Math.cos(angle);
  const y = 50 + ry * Math.sin(angle);
  return {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
  };
}

export default function Felt({
  players,
  board,
  pot,
  buttonPlayer,
  winners,
  centerLabel,
  fillHeight = false,
}: {
  players: SeatPlayer[];
  board: string[];
  pot: number;
  buttonPlayer?: string | null;
  winners?: string[];
  centerLabel?: string;
  /** Fill parent height (side-by-side desktop layout). */
  fillHeight?: boolean;
}) {
  const { t } = useI18n();
  const compact = useIsMobile();
  const winSet = new Set(winners ?? []);

  // fillHeight only on desktop side-by-side; mobile uses aspect box so chat stays below
  const sizeClass =
    fillHeight && !compact
      ? "h-full w-full max-w-3xl mx-auto"
      : compact
        ? "pb-[88%] min-h-[200px] max-h-[min(48vh,360px)] w-full mx-auto max-w-3xl"
        : "pb-[72%] sm:pb-[68%] md:pb-[62%] w-full mx-auto max-w-3xl";

  return (
    <div className={`relative shrink-0 overflow-visible ${sizeClass}`}>
      <div className="felt-table absolute inset-0 rounded-[50%]">
        <div className="absolute inset-0 grid place-items-center px-2">
          <div className="flex flex-col items-center gap-2 sm:gap-3 max-w-[85%] py-1 sm:py-2">
            <div className="chip-badge inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-xs sm:text-sm">
              <ChipStack size="md" />
              <span>
                {t("felt.pot")} {pot}
              </span>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
              {board.length === 0 ? (
                <span className="text-evo-gray5 text-xs sm:text-sm text-center px-2">
                  {centerLabel ?? t("felt.waiting")}
                </span>
              ) : (
                board.map((c, i) => <Card key={i} card={c} size="lg" />)
              )}
            </div>
            {centerLabel && board.length > 0 && (
              <div className="text-evo-gray5 text-[10px] sm:text-xs text-center line-clamp-2 mt-1 sm:mt-2 px-2">
                {centerLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {players.map((p, i) => (
        <div key={p.id} style={seatStyle(i, players.length, compact)}>
          <Seat
            player={p}
            isButton={buttonPlayer === p.id}
            isWinner={winSet.has(p.id)}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
}
