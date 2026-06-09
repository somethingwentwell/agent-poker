"use client";

import { use } from "react";
import ConnectPrompt from "@/components/ConnectPrompt";
import { useI18n } from "@/components/LocaleProvider";

export default function RoomConnectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t } = useI18n();

  return (
    <main className="page-shell mx-auto max-w-lg">
      <a
        href={`/room/${code}`}
        className="text-evo-gray5 text-sm hover:text-evo-blue6 transition"
      >
        {t("connect.viewTable")}
      </a>
      <ConnectPrompt roomCode={code} showQr={false} />
    </main>
  );
}
