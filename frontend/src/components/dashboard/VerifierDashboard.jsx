import { useState } from "react";
import VerificationWorkbench from "../verification/VerificationWorkbench";
import { Card, CardBody, CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";

function Section({ hidden, children }) {
  if (hidden) {
    return null;
  }

  return <div className="space-y-4">{children}</div>;
}

export default function VerifierDashboard({ activeSection }) {
  const [rapidTips] = useState([
    "Use QR scan for near-instant hash capture.",
    "Cross-check integrity grade before export decisions.",
    "Escalate revocation mismatches to institution admins."
  ]);

  return (
    <>
      <Section hidden={activeSection !== "overview"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Verification profile</p>
            <p className="mt-1 text-xl font-semibold text-text">Enterprise Verifier</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Trust signal</p>
            <div className="mt-2">
              <Badge tone="success">Blockchain anchored</Badge>
            </div>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Mode</p>
            <p className="mt-1 text-xl font-semibold text-text">Fast verify</p>
          </article>
        </div>

        <Card>
          <CardHeader title="Verification Ops Guidance" subtitle="Workflow hints for high-throughput hiring and compliance teams." />
          <CardBody className="space-y-2 text-sm text-muted">
            {rapidTips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "workbench"}>
        <VerificationWorkbench compact />
      </Section>
    </>
  );
}