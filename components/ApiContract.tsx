"use client";

import { useI18n } from "@/components/LocaleProvider";
import {
  ACTION_FIELDS,
  AGENT_ENV,
  CARD_RANKS,
  CARD_SUITS,
  CREATE_ROOM_FIELDS,
  HAND_NAMES,
  HISTORY_ACTION_TYPES,
  HTTP_ERRORS,
  JOIN_FIELDS,
  LEGAL_ACTIONS_FIELDS,
  LIMITS,
  PLAYER_ACTIONS,
  ROOM_STATUSES,
  START_FIELDS,
  STATE_QUERY,
  STREETS,
} from "@/lib/api-contract";
import type { Messages } from "@/lib/i18n";

function TagList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <code
          key={item}
          className="text-[11px] bg-black/40 border border-evo-gray11/50 px-1.5 py-0.5 rounded text-evo-blue6"
        >
          {item}
        </code>
      ))}
    </div>
  );
}

function FieldTable({
  rows,
  labels,
}: {
  rows: readonly {
    field: string;
    type?: string;
    required?: boolean;
    default?: string;
    allowed?: readonly string[];
    note: string;
  }[];
  labels: Messages["contract"]["table"];
}) {
  const { t } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="text-evo-gray7 border-b border-evo-gray11/40">
            <th className="py-1.5 pr-3 font-medium">{labels.field}</th>
            <th className="py-1.5 pr-3 font-medium">{labels.type}</th>
            <th className="py-1.5 pr-3 font-medium">{labels.req}</th>
            <th className="py-1.5 font-medium">{labels.notes}</th>
          </tr>
        </thead>
        <tbody className="text-evo-gray5">
          {rows.map((r) => (
            <tr key={r.field} className="border-b border-evo-gray11/20">
              <td className="py-1.5 pr-3">
                <code className="text-evo-blue6">{r.field}</code>
              </td>
              <td className="py-1.5 pr-3">
                {r.allowed ? (
                  <span className="text-evo-gray1">{r.allowed.join(" | ")}</span>
                ) : (
                  r.type ?? "—"
                )}
              </td>
              <td className="py-1.5 pr-3">
                {r.required ? t("common.yes") : t("common.no")}
              </td>
              <td className="py-1.5">
                {r.default && (
                  <span className="text-evo-gray7 mr-1">
                    {t("common.default")} {r.default} ·
                  </span>
                )}
                {r.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-evo-gray1 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function useContractRows() {
  const { messages, t } = useI18n();
  const n = messages.contract.fieldNotes;

  return {
    createRoom: CREATE_ROOM_FIELDS.map((f) => ({
      ...f,
      note: n[f.field as keyof typeof n] ?? f.note,
    })),
    join: JOIN_FIELDS.map((f) => ({
      ...f,
      note: n[f.field as keyof typeof n] ?? f.note,
    })),
    start: START_FIELDS.map((f) => ({
      ...f,
      note: n[f.field as keyof typeof n] ?? f.note,
    })),
    action: ACTION_FIELDS.map((f) => ({
      ...f,
      note: n[f.field as keyof typeof n] ?? f.note,
    })),
    legal: LEGAL_ACTIONS_FIELDS.map((f) => ({
      ...f,
      note: n[f.field as keyof typeof n] ?? f.note,
    })),
    stateQuery: STATE_QUERY.map((q) => ({
      field: q.param,
      required: q.required,
      note: q.param === "playerId" ? n.playerIdQ : n.tokenQ,
    })),
    handNames: HAND_NAMES.map(
      (h) => messages.contract.handNames[h as keyof typeof messages.contract.handNames] ?? h,
    ),
    t,
    messages,
  };
}

export function ApiContractFull() {
  const { t, messages } = useI18n();
  const rows = useContractRows();
  const s = messages.contract.sections;

  return (
    <div className="space-y-8">
      <Section title={s.roomStatus}>
        <TagList items={ROOM_STATUSES} />
      </Section>

      <Section title={s.streets}>
        <TagList items={STREETS} />
      </Section>

      <Section title={s.playerActions}>
        <TagList items={PLAYER_ACTIONS} />
        <p className="text-evo-gray7 text-xs mt-2">{messages.contract.raiseHint}</p>
      </Section>

      <Section title={s.historyTypes}>
        <TagList items={HISTORY_ACTION_TYPES} />
        <p className="text-evo-gray7 text-xs mt-2">{messages.contract.historyHint}</p>
      </Section>

      <Section title={s.cards}>
        <p className="text-evo-gray5 text-xs mb-2">{messages.contract.cardFormat}</p>
        <p className="text-evo-gray7 text-xs mb-1">{messages.contract.ranks}</p>
        <TagList items={CARD_RANKS} />
        <p className="text-evo-gray7 text-xs mt-2 mb-1">{messages.contract.suits}</p>
        <div className="flex flex-wrap gap-2 text-xs text-evo-gray5">
          {CARD_SUITS.map((su) => (
            <span key={su}>
              <code className="text-evo-blue6">{su}</code> ={" "}
              {messages.contract.suitNames[su as keyof typeof messages.contract.suitNames]}
            </span>
          ))}
        </div>
      </Section>

      <Section title={s.handRankings}>
        <TagList items={rows.handNames} />
      </Section>

      <Section title={s.limits}>
        <ul className="text-xs text-evo-gray5 space-y-1 list-disc list-inside">
          <li>{t("contract.limits.roomCode", { len: LIMITS.roomCodeLength })}</li>
          <li>
            {t("contract.limits.players", {
              min: LIMITS.minPlayersToStart,
              max: LIMITS.maxPlayersPerRoom,
            })}
          </li>
          <li>{t("contract.limits.nameLen", { len: LIMITS.playerNameMaxLength })}</li>
          <li>{t("contract.limits.avatars", { range: LIMITS.avatarIds })}</li>
          <li>
            {t("contract.limits.blinds", {
              stack: LIMITS.defaultStartingChips,
              sb: LIMITS.defaultSmallBlind,
              bb: LIMITS.defaultBigBlind,
            })}
          </li>
          <li>{t("contract.limits.maxHands", { note: LIMITS.maxHandsNote })}</li>
          <li>{t("contract.limits.poll", { ms: LIMITS.pollIntervalMs })}</li>
        </ul>
      </Section>

      <Section title={s.createRoom}>
        <FieldTable rows={rows.createRoom} labels={messages.contract.table} />
      </Section>
      <Section title={s.join}>
        <FieldTable rows={rows.join} labels={messages.contract.table} />
      </Section>
      <Section title={s.start}>
        <FieldTable rows={rows.start} labels={messages.contract.table} />
      </Section>
      <Section title={s.action}>
        <FieldTable rows={rows.action} labels={messages.contract.table} />
      </Section>
      <Section title={s.legalActions}>
        <FieldTable rows={rows.legal} labels={messages.contract.table} />
      </Section>
      <Section title={s.stateQuery}>
        <FieldTable rows={rows.stateQuery} labels={messages.contract.table} />
      </Section>

      <Section title={s.agentEnv}>
        <div className="space-y-2">
          {AGENT_ENV.map((v) => (
            <div key={v.name} className="text-xs">
              <code className="text-evo-blue6">{v.name}</code>
              <span className="text-evo-gray7 ml-2">
                {v.required ? t("common.required") : t("common.optional")}
                {v.example ? ` · ${t("common.example")} ${v.example}` : ""}
              </span>
              <p className="text-evo-gray5 mt-0.5">
                {messages.contract.env[v.name as keyof typeof messages.contract.env]}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.agentLoop}>
        <ol className="text-xs text-evo-gray5 space-y-1 list-decimal list-inside">
          {messages.contract.agentLoop.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>

      <Section title={s.httpErrors}>
        <ul className="text-xs text-evo-gray5 space-y-1">
          {HTTP_ERRORS.map((e) => (
            <li key={e.status}>
              <code className="text-evo-blue6">{e.status}</code> —{" "}
              {messages.contract.httpErrors[String(e.status) as keyof typeof messages.contract.httpErrors]}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function ApiContractCompact() {
  const { messages } = useI18n();
  const c = messages.contract.compact;

  return (
    <div className="text-xs text-evo-gray5 space-y-3 mt-3 border-t border-evo-gray11/30 pt-3">
      <div>
        <p className="text-evo-gray7 mb-1">{c.envVars}</p>
        <p>
          {AGENT_ENV.map((v) => (
            <span key={v.name}>
              <code className="text-evo-blue6">{v.name}</code>
              {v.required ? "" : "?"}{" "}
            </span>
          ))}
        </p>
      </div>
      <div>
        <p className="text-evo-gray7 mb-1">{c.actions}</p>
        <TagList items={PLAYER_ACTIONS} />
      </div>
      <div>
        <p className="text-evo-gray7 mb-1">{c.legalFields}</p>
        <TagList items={LEGAL_ACTIONS_FIELDS.map((f) => f.field)} />
      </div>
      <div>
        <p className="text-evo-gray7 mb-1">{c.statusStreets}</p>
        <TagList items={[...ROOM_STATUSES, ...STREETS]} />
      </div>
      <div>
        <p className="text-evo-gray7 mb-1">{c.cards}</p>
        <p>{messages.contract.cardFormat}</p>
      </div>
      <p className="text-evo-gray7">
        {c.fullDocs}{" "}
        <a href="/docs" className="text-evo-blue6 underline">
          /docs
        </a>
      </p>
    </div>
  );
}
