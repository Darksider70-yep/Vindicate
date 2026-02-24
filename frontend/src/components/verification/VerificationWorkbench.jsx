import { memo, useEffect, useMemo, useState } from "react";
import { verifyCredential } from "../../utils/api";
import { ensureHashCandidate } from "../../utils/ui";
import { useToast } from "../../context/ToastContext";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Skeleton } from "../ui/Skeleton";
import VerificationResultCard from "./VerificationResultCard";
import QrScannerModal from "./QrScannerModal";

const InitialGuidance = memo(function InitialGuidance() {
  return (
    <Card>
      <CardBody className="text-sm text-muted">
        Enter a credential hash or scan a QR code. Vindicate validates blockchain, database, and storage integrity before returning a trust decision.
      </CardBody>
    </Card>
  );
});

export default function VerificationWorkbench({ initialHash = "", compact = false }) {
  const { pushToast } = useToast();
  const [hash, setHash] = useState(initialHash);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (initialHash) {
      setHash(initialHash);
    }
  }, [initialHash]);

  const canSubmit = useMemo(() => /^0x[a-fA-F0-9]{64}$/.test(hash.trim()), [hash]);

  const runVerification = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = await verifyCredential(ensureHashCandidate(hash));
      setResult({ ok: true, value: payload });
      pushToast("Credential verified successfully.", "success");
    } catch (error) {
      setResult({
        ok: false,
        value: {
          error: {
            message: error.message,
            code: error.code
          }
        }
      });
      pushToast(error.message || "Verification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Credential Verification"
          subtitle="Instant trust verdict with transparency indicators."
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => setScannerOpen(true)}>
              Scan QR
            </Button>
          }
        />
        <CardBody>
          <form className="space-y-3" onSubmit={runVerification}>
            <Input
              id="verificationHash"
              label="Credential hash"
              value={hash}
              onChange={(event) => setHash(event.target.value)}
              placeholder="0x..."
              hint="Expected format: 0x + 64 hex characters"
              aria-label="Credential hash input"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="submit" className={compact ? "sm:w-auto" : "w-full sm:w-auto"} loading={loading} disabled={!canSubmit}>
                Verify now
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <CardBody className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-44" />
          </CardBody>
        </Card>
      ) : null}

      {!loading && result?.ok ? <VerificationResultCard result={result.value} /> : null}

      {!loading && result && !result.ok ? (
        <Card>
          <CardBody>
            <p className="rounded-lg border border-danger/35 bg-danger/15 p-3 text-sm font-semibold text-danger">
              {result.value?.error?.message || "Verification failed."}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {!loading && !result ? <InitialGuidance /> : null}

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onHashResolved={(resolvedHash) => setHash(resolvedHash)}
      />
    </div>
  );
}