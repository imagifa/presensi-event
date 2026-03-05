"use client";

import { useEffect, useRef } from "react";
import jsQR from "jsqr";

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
};

export default function QrScannerModal({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let raf = 0;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const w = video.videoWidth;
          const h = video.videoHeight;

          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);

            const code = jsQR(imageData.data, w, h);

            if (code) {
              cleanup();
              onResult(code.data);
              return;
            }
          }
        }

        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
    }

    function cleanup() {
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }

    start();

    return () => cleanup();
  }, [open, onResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">Scan QR Member</h2>
          <button onClick={onClose}>Tutup</button>
        </div>

        <video
          ref={videoRef}
          className="w-full rounded-xl"
          playsInline
          muted
        />

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}