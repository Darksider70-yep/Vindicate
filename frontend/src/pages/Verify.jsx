import { useMemo } from "react";
import { useParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import { Card, CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import VerificationWorkbench from "../components/verification/VerificationWorkbench";

export default function Verify() {
  const { hash } = useParams();

  const normalizedHash = useMemo(() => (hash ? hash.toLowerCase() : ""), [hash]);

  return (
    <PageContainer className="space-y-4 lg:space-y-6">
      <Card>
        <CardBody className="space-y-3">
          <Badge tone="primary">Verification Portal</Badge>
          <h1 className="text-2xl font-semibold text-text md:text-3xl">Trust-first credential verification</h1>
          <p className="max-w-3xl text-sm text-muted md:text-base">
            Submit a credential hash or scan a QR payload. Vindicate validates integrity across blockchain, database, and
            distributed storage layers, then returns signed transparency evidence.
          </p>
        </CardBody>
      </Card>

      <VerificationWorkbench initialHash={normalizedHash} />
    </PageContainer>
  );
}