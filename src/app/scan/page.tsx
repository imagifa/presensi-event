"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Scanner = dynamic(
  () => import("../../components/qr/QrScannerModal"),
  { ssr: false }
);

export default function ScanPage() {
  const [open, setOpen] = useState(true);

  async function handleScan(code: string) {
    const res = await fetch("/api/public/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        member_id: code,
      }),
    });

    const data = await res.json();

    alert(data.message ?? "Check-in berhasil");
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">
        SCAN QR PRESENSI
      </h1>

      <Scanner
        open={open}
        onClose={() => setOpen(false)}
        onResult={handleScan}
      />
    </main>
  );
}
