import Badge from "../ui/Badge";

export default function TrustBadge({ passed }) {
  const pulseColor = passed ? "18 148 106" : "179 37 65";

  return (
    <div
      className="relative inline-flex items-center"
      style={{ "--pulse-color": pulseColor }}
      aria-label={passed ? "Credential is trusted" : "Credential failed integrity checks"}
    >
      <span className="absolute inset-0 rounded-full bg-transparent animate-pulseRing" />
      <Badge tone={passed ? "success" : "danger"} className="relative gap-2 px-3 py-1.5 text-sm">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-current" />
        {passed ? "Trust Verified" : "Integrity Failure"}
      </Badge>
    </div>
  );
}