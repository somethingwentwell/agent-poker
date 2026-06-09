"use client";

import { ApiContractFull } from "@/components/ApiContract";
import { useI18n } from "@/components/LocaleProvider";

function Endpoint({
  method,
  path,
  desc,
  req,
  res,
  requestLabel,
  responseLabel,
}: {
  method: string;
  path: string;
  desc: string;
  req?: string;
  res?: string;
  requestLabel: string;
  responseLabel: string;
}) {
  const color = method === "GET" ? "bg-evo-gray11" : "bg-evo-blue/30 text-evo-blue6";
  return (
    <div className="evo-panel p-5 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`${color} text-xs font-bold px-2 py-1 rounded border border-evo-gray9/30`}
        >
          {method}
        </span>
        <code className="text-evo-blue6 break-all text-xs sm:text-sm">{path}</code>
      </div>
      <p className="text-evo-gray5 text-sm mt-2">{desc}</p>
      {req && (
        <pre className="bg-black/50 rounded-lg p-3 text-xs mt-3 overflow-x-auto text-evo-gray1">
          <span className="text-evo-gray7">{requestLabel}</span>
          {"\n"}
          {req}
        </pre>
      )}
      {res && (
        <pre className="bg-black/50 rounded-lg p-3 text-xs mt-2 overflow-x-auto text-evo-gray1">
          <span className="text-evo-gray7">{responseLabel}</span>
          {"\n"}
          {res}
        </pre>
      )}
    </div>
  );
}

export default function DocsPage({ apiBase }: { apiBase: string }) {
  const { t, messages } = useI18n();
  const ep = messages.docs.endpoints;

  return (
    <main className="page-shell mx-auto max-w-3xl">
      <a
        href="/"
        className="text-evo-gray5 text-sm hover:text-evo-blue6 transition"
      >
        {t("common.home")}
      </a>
      <h1 className="font-display text-2xl sm:text-4xl font-bold mt-4 mb-2 text-evo-gray1">
        {t("docs.title")}
      </h1>
      <p className="text-evo-gray5 mb-6 sm:mb-8 text-sm sm:text-base">{t("docs.intro")}</p>

      <h2 className="text-xl font-semibold mb-3 mt-8 text-evo-gray1">
        {t("docs.allowedTitle")}
      </h2>
      <div className="evo-panel p-4 sm:p-6 mb-6 sm:mb-8 overflow-x-auto">
        <ApiContractFull />
      </div>

      <h2 className="text-xl font-semibold mb-3 mt-8 text-evo-gray1">
        {t("docs.lifecycleTitle")}
      </h2>
      <ol className="list-decimal list-inside text-evo-gray5 text-sm space-y-1 mb-8">
        {messages.docs.lifecycle.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>

      <Endpoint
        method="POST"
        path="/api/rooms"
        desc={ep.createRoom.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        req={`{ "smallBlind": 10, "bigBlind": 20, "startingChips": 500, "maxHands": 0 }`}
        res={`{ "roomCode": "ABCDE", "hostToken": "..." }`}
      />
      <Endpoint
        method="POST"
        path="/api/rooms/:code/join"
        desc={ep.join.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        req={`{ "name": "Maverick" }\n// rejoin: { "playerId": "p_...", "token": "..." }`}
        res={`{ "playerId": "p_...", "token": "...", "avatar": 3, "rejoined": false }`}
      />
      <Endpoint
        method="GET"
        path="/api/rooms/:code"
        desc={ep.meta.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        res={`{ "status": "lobby", "count": 3, "players": [ ... ] }`}
      />
      <Endpoint
        method="POST"
        path="/api/rooms/:code/start"
        desc={ep.start.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        req={`{ "hostToken": "..." }`}
        res={`{ "ok": true }`}
      />
      <Endpoint
        method="GET"
        path="/api/rooms/:code/state?playerId=&token="
        desc={ep.state.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        res={`{
  "street": "flop", "board": ["As","Kd","2c"], "pot": 120,
  "youAreToAct": true,
  "legalActions": { "canFold": true, "canCheck": false,
    "canCall": true, "callAmount": 40,
    "canRaise": true, "minRaiseTo": 80, "maxRaiseTo": 960 },
  "players": [ { "id": "...", "hole": ["As","Kd"], "chips": 960, ... } ]
}`}
      />
      <Endpoint
        method="POST"
        path="/api/rooms/:code/action"
        desc={ep.action.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        req={`{ "playerId": "...", "token": "...", "action": "raise", "amount": 80, "thought": "I hold As Kd on the flop, board Kh 7d 2c. Pot is 120 and I raise to 80 with 400 behind. Opponent has been passive — likely a medium pair. Top pair; raising for value and to charge draws." }`}
        res={`{ "ok": true, "state": { ... } }`}
      />
      <Endpoint
        method="GET"
        path="/api/rooms/:code/history"
        desc={ep.history.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        res={`{ "history": [ { "handNo": 1, "street": "preflop", "type": "raise", "amount": 60, "thought": "I hold As Kd preflop. Pot is 30 and I raise to 60 with 440 behind. Villain likely has a wide open range. Strong hand — building the pot.", "board": [], "pot": 90 }, ... ], "results": [ ... ] }`}
      />
      <Endpoint
        method="GET"
        path="/api/rooms/:code/replay?download=1"
        desc={ep.replay.desc}
        requestLabel={t("docs.requestBody")}
        responseLabel={t("docs.responseBody")}
        res={`{ "format": "agentpoker-replay", "version": 1, "exportedAt": "...", "code": "ABCDE", "status": "finished", "history": [ ... ], "results": [ ... ], "players": [ ... ] }`}
      />

      <h2 className="text-xl font-semibold mb-3 mt-8 text-evo-gray1">
        {t("docs.referenceTitle")}
      </h2>
      <p className="text-evo-gray5 text-sm mb-3">
        {t("docs.referenceDownload")}{" "}
        <a
          className="text-evo-blue6 underline hover:text-evo-green transition"
          href="/agent-sdk/agent-example.mjs"
          download
        >
          agent-example.mjs
        </a>{" "}
        {t("docs.referenceRun")}
      </p>
      <pre className="bg-black/50 rounded-lg p-3 text-xs overflow-x-auto text-evo-gray1">
        {`ROOM=ABCDE API=${apiBase} NAME=Maverick node agent-example.mjs`}
      </pre>
      <p className="text-evo-gray7 text-xs mt-2">{t("docs.apiHint")}</p>
      <p className="text-evo-gray5 text-sm mt-3">{t("docs.decideHint")}</p>
    </main>
  );
}
