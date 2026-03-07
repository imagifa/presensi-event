"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
};

export default function QrScannerModal({ open, onClose, onResult }: Props) {
  const lastScanRef = useRef<number>(0);
  const [status, setStatus] = useState("");

  if (!open) return null;

  function playBeep() {
    const audio = new Audio("/beep.mp3");
    audio.play().catch(() => {});
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">

        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Scan QR</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border text-sm"
          >
            Tutup
          </button>
        </div>

        <div className="rounded-xl overflow-hidden">
          <Scanner
            onScan={(result) => {
              if (!result?.length) return;

              const code = result[0].rawValue;

              const now = Date.now();

              if (now - lastScanRef.current < 1200) return;

              lastScanRef.current = now;

              playBeep();

              setStatus(`Scan: ${code}`);

              onResult(code);
            }}
            onError={(err) => {
              console.error(err);
              setStatus("Kamera error");
            }}
            constraints={{
              facingMode: "environment",
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-500">
          {status || "Arahkan QR ke kamera"}
        </div>

      </div>
    </div>
  );
}
