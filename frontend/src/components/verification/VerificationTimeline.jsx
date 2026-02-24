import { formatDateTime } from "../../utils/ui";

export default function VerificationTimeline({ payload }) {
  const credential = payload?.credential;
  const onChain = payload?.onChain;
  const events = [
    {
      key: "issued",
      label: "Credential Issued",
      time: credential?.issuedAt || onChain?.issuedAt,
      description: `Issuer: ${credential?.issuer?.walletAddress || onChain?.issuer || "Unknown"}`
    },
    {
      key: "anchored",
      label: "Anchored On-Chain",
      time: credential?.createdAt,
      description: `Credential ID #${onChain?.credentialId || "-"}`
    },
    credential?.revocation
      ? {
          key: "revoked",
          label: "Revoked",
          time: credential.revocation.revokedAt,
          description: credential.revocation.reason || "No reason provided"
        }
      : null
  ].filter(Boolean);

  if (!events.length) {
    return null;
  }

  return (
    <ol className="space-y-3" aria-label="Verification timeline">
      {events.map((event) => (
        <li key={event.key} className="flex gap-3">
          <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
          <div>
            <p className="text-sm font-semibold text-text">{event.label}</p>
            <p className="text-xs text-muted">{formatDateTime(event.time)}</p>
            <p className="mt-0.5 text-xs text-muted">{event.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}