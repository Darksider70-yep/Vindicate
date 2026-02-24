import { Card, CardBody, CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import TrustBadge from "./TrustBadge";
import VerificationTimeline from "./VerificationTimeline";
import { getExplorerTxLink } from "../../utils/explorer";
import { formatDateTime } from "../../utils/ui";

function Indicator({ label, active }) {
  return (
    <div className="rounded-lg border border-border/70 bg-panel p-2">
      <p className="text-xs text-muted">{label}</p>
      <Badge tone={active ? "success" : "danger"} className="mt-1">
        {active ? "Pass" : "Fail"}
      </Badge>
    </div>
  );
}

export default function VerificationResultCard({ result }) {
  const payload = result?.payload;
  const integrity = payload?.integrity;
  const passed = Boolean(integrity?.passed);
  const credential = payload?.credential;
  const txHash = credential?.txHash;
  const txLink = getExplorerTxLink(txHash);

  if (!payload) {
    return null;
  }

  return (
    <Card className="animate-fade-in overflow-hidden">
      <CardHeader
        title="Verification Result"
        subtitle={passed ? "Credential passed all trust checks." : "Credential failed one or more integrity checks."}
        action={<TrustBadge passed={passed} />}
      />

      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicator label="Blockchain Hash" active={integrity?.checks?.blockchainHashMatchesDb} />
          <Indicator label="IPFS CID" active={integrity?.checks?.ipfsCidValid} />
          <Indicator label="Checksum" active={integrity?.checks?.ipfsChecksumMatchesDb} />
          <Indicator label="Status Sync" active={integrity?.checks?.statusConsistency} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-xl border border-border/70 bg-panel p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Credential Metadata</h4>
            <dl className="space-y-1 text-sm text-text">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted">Credential Hash</dt>
                <dd className="max-w-[60%] break-all font-mono text-xs">{credential?.credentialHash || "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Institution</dt>
                <dd className="text-right">{credential?.institution?.name || "Unknown"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Status</dt>
                <dd>
                  <Badge tone={credential?.status === "REVOKED" ? "danger" : "success"}>
                    {credential?.status || "ACTIVE"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Signed Response At</dt>
                <dd>{formatDateTime(result?.signedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2 rounded-xl border border-border/70 bg-panel p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Transparency Indicators</h4>
            <ul className="space-y-1 text-sm text-text">
              <li>Integrity grade: <strong>{integrity?.grade || "-"}</strong></li>
              <li>Integrity score: <strong>{integrity?.score ?? "-"}</strong></li>
              <li>Blockchain confirmation: <strong>{payload?.onChain ? "Confirmed" : "Unavailable"}</strong></li>
              <li>Storage integrity: <strong>{payload?.ipfsVerification?.cidMatches ? "Valid" : "Mismatch"}</strong></li>
              <li>Signature algorithm: <strong>{result?.algorithm || "-"}</strong></li>
            </ul>

            {txHash ? (
              <p className="text-xs text-muted">
                Transaction: <span className="break-all font-mono">{txHash}</span>
                {txLink ? (
                  <>
                    {" "}
                    <a href={txLink} target="_blank" rel="noreferrer" className="font-semibold">
                      Open explorer
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-panel p-4">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Verification Timeline</h4>
            <VerificationTimeline payload={payload} />
          </section>

          <section className="rounded-xl border border-border/70 bg-panel p-4">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Signed Envelope</h4>
            <pre className="max-h-52 overflow-auto rounded-lg bg-surface p-3 text-xs text-text">
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        </div>
      </CardBody>
    </Card>
  );
}