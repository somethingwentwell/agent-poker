"use client";

import { useI18n } from "@/components/LocaleProvider";
import Card from "./Card";
import ChipStack, { DealerButton } from "./ChipStack";
import PlayerAvatar from "./PlayerAvatar";

export interface SeatPlayer {
  id: string;
  name: string;
  avatar: number;
  chips: number;
  folded?: boolean;
  allIn?: boolean;
  sittingOut?: boolean;
  committed?: number;
  streetCommitted?: number;
  hole?: string[];
  isTurn?: boolean;
  connected?: boolean;
}

export default function Seat({
  player,
  isButton,
  isWinner,
  compact = false,
}: {
  player: SeatPlayer;
  isButton?: boolean;
  isWinner?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const cardSize = compact ? "xs" : "sm";

  return (
    <div
      className={`relative flex flex-col items-center select-none ${
        compact ? "w-[3.75rem] sm:w-20" : "w-20 sm:w-24 md:w-28"
      } ${player.folded ? "opacity-40 grayscale" : ""}`}
    >
      <div className={`flex gap-0.5 mb-0.5 ${compact ? "h-6 sm:h-7" : "h-7 sm:h-10"}`}>
        {(player.hole ?? ["??", "??"]).map((c, i) => (
          <Card key={i} card={c} size={cardSize} />
        ))}
      </div>

      <div
        className={`relative rounded-lg sm:rounded-xl p-0.5 sm:p-1 ${
          player.isTurn
            ? "turn-ring ring-2 ring-evo-blue6"
            : "ring-1 ring-black/30"
        } ${isWinner ? "ring-2 ring-evo-yellow" : ""} bg-evo-gray11/30`}
      >
        <PlayerAvatar avatar={player.avatar} compact={compact} />
        {player.connected !== undefined && (
          <span
            className={`absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-black/50 ${
              player.connected ? "bg-evo-green" : "bg-evo-gray9"
            }`}
            title={
              player.connected
                ? t("seat.connected")
                : t("seat.disconnected")
            }
          />
        )}
        {isButton && <DealerButton compact={compact} />}
        {player.allIn && !player.folded && (
          <span className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] bg-evo-gray11 text-evo-gray1 px-1 sm:px-1.5 py-0.5 rounded border border-evo-blue/30 whitespace-nowrap">
            {t("seat.allIn")}
          </span>
        )}
      </div>

      <div className="mt-0.5 sm:mt-1 text-center max-w-full">
        <div
          className={`font-semibold truncate text-evo-gray1 ${
            compact ? "text-[9px] max-w-[3.5rem] sm:max-w-[5rem]" : "text-[10px] sm:text-xs max-w-[5rem] sm:max-w-[7rem]"
          }`}
        >
          {player.name}
        </div>
        <div
          className={`inline-flex items-center gap-1 mt-0.5 font-bold rounded-full chip-badge ${
            compact ? "text-[9px] px-1.5 py-px" : "text-[10px] sm:text-[11px] px-2 py-0.5"
          }`}
        >
          <ChipStack size="sm" />
          {player.chips}
        </div>
      </div>

      {!!player.streetCommitted && player.streetCommitted > 0 && (
        <div
          className={`absolute flex items-center gap-1 bg-black/60 pl-1 pr-1.5 sm:px-2 py-0.5 rounded-full border border-evo-yellow/40 text-evo-gray1 whitespace-nowrap ${
            compact
              ? "-bottom-4 text-[8px] sm:text-[9px]"
              : "-bottom-5 sm:-bottom-7 text-[9px] sm:text-[11px]"
          }`}
        >
          <ChipStack size="sm" tone="red" />
          <span>
            {t("seat.bet")} {player.streetCommitted}
          </span>
        </div>
      )}
    </div>
  );
}
