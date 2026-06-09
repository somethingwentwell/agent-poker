declare module "react-qr-code" {
  import type { FC } from "react";

  interface QRCodeProps {
    value: string;
    size?: number;
    level?: "L" | "M" | "Q" | "H";
    bgColor?: string;
    fgColor?: string;
  }

  const QRCode: FC<QRCodeProps>;
  export default QRCode;
}
