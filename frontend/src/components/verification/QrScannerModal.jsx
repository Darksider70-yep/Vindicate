import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input } from "../ui/Input";

function extractHash(input) {
  if (!input) {
    return null;
  }

  const hashMatch = input.toLowerCase().match(/0x[a-f0-9]{64}/);
  return hashMatch ? hashMatch[0] : null;
}

export default function QrScannerModal({ open, onClose, onHashResolved }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState("Preparing camera...");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let canceled = false;

    const startScanner = async () => {
      if (!("BarcodeDetector" in window)) {
        setStatus("QR scanning is not supported in this browser. Paste QR text below.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("Point your camera at the QR code.");

        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current) {
            return;
          }

          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            const hash = extractHash(value);
            if (hash) {
              onHashResolved(hash);
              onClose();
            }
          } catch {
            // Detector errors are non-fatal during streaming.
          }
        }, 350);
      } catch {
        setStatus("Camera permission unavailable. Paste QR text below.");
      }
    };

    startScanner();

    return () => {
      canceled = true;

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onClose, onHashResolved, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan verification QR"
      description="Use your device camera or paste a QR payload containing a credential hash."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-panel p-2">
          <video ref={videoRef} className="h-56 w-full rounded-lg bg-black/65 object-cover" muted playsInline />
          <p className="mt-2 text-xs text-muted">{status}</p>
        </div>

        <Input
          id="manualQrValue"
          label="Manual QR input"
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder="Paste QR payload or verification URL"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              const hash = extractHash(manualValue);
              if (hash) {
                onHashResolved(hash);
                onClose();
              } else {
                setStatus("No valid credential hash found in input.");
              }
            }}
          >
            Use value
          </Button>
        </div>
      </div>
    </Modal>
  );
}