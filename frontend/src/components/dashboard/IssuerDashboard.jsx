import { useMemo, useState } from "react";
import { issueCredential, revokeCredential } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { fileToBase64 } from "../../utils/file";
import { formatDateTime } from "../../utils/ui";
import { getExplorerTxLink } from "../../utils/explorer";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Input, Textarea } from "../ui/Input";

function Section({ hidden, children }) {
  if (hidden) {
    return null;
  }

  return <div className="space-y-4">{children}</div>;
}

export default function IssuerDashboard({ activeSection, user }) {
  const { pushToast } = useToast();

  const [studentAddress, setStudentAddress] = useState("");
  const [institutionId, setInstitutionId] = useState(user?.institutionId || "");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("application/pdf");
  const [metadata, setMetadata] = useState("{}");
  const [encrypt, setEncrypt] = useState(false);

  const [issuedRecords, setIssuedRecords] = useState([]);
  const [revokeHash, setRevokeHash] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const issuanceCount = issuedRecords.length;
  const revokedCount = issuedRecords.filter((item) => item.status === "REVOKED").length;

  const latestIssued = useMemo(() => issuedRecords.slice(0, 6), [issuedRecords]);

  const handleIssue = async (event) => {
    event.preventDefault();
    if (!file) {
      pushToast("Select a credential file before issuing.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const parsedMetadata = JSON.parse(metadata || "{}");

      const payload = await issueCredential({
        studentAddress: studentAddress.trim(),
        institutionId: institutionId.trim(),
        fileName: fileName.trim() || file.name,
        mimeType,
        fileBase64,
        metadata: parsedMetadata,
        encrypt
      });

      setIssuedRecords((current) => [
        {
          id: payload?.credential?.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: "ACTIVE",
          hash: payload?.credential?.credentialHash,
          txHash: payload?.blockchain?.txHash,
          studentAddress: payload?.credential?.studentAddress
        },
        ...current
      ]);

      pushToast("Credential issued and anchored on-chain.", "success");
      setFile(null);
      setStudentAddress("");
    } catch (error) {
      pushToast(error.message || "Issuance failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setSubmitting(true);
    try {
      await revokeCredential({
        credentialHash: revokeHash.trim(),
        reason: revokeReason.trim()
      });

      setIssuedRecords((current) =>
        current.map((item) =>
          item.hash?.toLowerCase() === revokeHash.trim().toLowerCase() ? { ...item, status: "REVOKED" } : item
        )
      );

      pushToast("Credential revoked successfully.", "success");
      setRevokeHash("");
      setRevokeReason("");
    } catch (error) {
      pushToast(error.message || "Revocation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Section hidden={activeSection !== "overview"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Issued this session</p>
            <p className="mt-1 text-2xl font-semibold text-text">{issuanceCount}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Revoked this session</p>
            <p className="mt-1 text-2xl font-semibold text-text">{revokedCount}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Institution scope</p>
            <p className="mt-1 text-sm font-semibold text-text break-all">{institutionId || "Not set"}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Issuer status</p>
            <div className="mt-2">
              <Badge tone="success">Verified issuer</Badge>
            </div>
          </article>
        </div>
      </Section>

      <Section hidden={activeSection !== "issue"}>
        <Card>
          <CardHeader
            title="Issue Credential"
            subtitle="Submit credential documents, metadata, and blockchain anchoring payloads."
          />
          <CardBody>
            <form className="space-y-4" onSubmit={handleIssue}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="issuerStudentAddress"
                  label="Student wallet"
                  required
                  value={studentAddress}
                  onChange={(event) => setStudentAddress(event.target.value)}
                  placeholder="0x..."
                />
                <Input
                  id="issuerInstitutionId"
                  label="Institution ID"
                  required
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                />
                <Input
                  id="issuerFileName"
                  label="Credential file name"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="transcript.pdf"
                />
                <Input
                  id="issuerMimeType"
                  label="MIME type"
                  value={mimeType}
                  onChange={(event) => setMimeType(event.target.value)}
                />
              </div>

              <label className="block">
                <span className="field-label">Credential file</span>
                <input
                  type="file"
                  required
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                />
              </label>

              <Textarea
                id="issuerMetadata"
                label="Metadata JSON"
                value={metadata}
                onChange={(event) => setMetadata(event.target.value)}
                rows={4}
              />

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  checked={encrypt}
                  onChange={(event) => setEncrypt(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Enable IPFS payload encryption
              </label>

              <Button type="submit" loading={submitting}>
                Issue credential
              </Button>
            </form>
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "issued"}>
        <Card>
          <CardHeader title="Issued Credentials" subtitle="Live issuance outputs for this operator session." />
          <CardBody>
            {latestIssued.length === 0 ? (
              <p className="text-sm text-muted">No credentials have been issued in this session yet.</p>
            ) : (
              <div className="space-y-3">
                {latestIssued.map((record) => {
                  const explorerLink = getExplorerTxLink(record.txHash);
                  return (
                    <article key={record.id} className="rounded-xl border border-border/70 bg-panel p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={record.status === "REVOKED" ? "danger" : "success"}>{record.status}</Badge>
                        <p className="text-xs text-muted">{formatDateTime(record.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted">Student: {record.studentAddress}</p>
                      <p className="mt-1 break-all font-mono text-xs text-text">{record.hash}</p>
                      {record.txHash ? (
                        <p className="mt-1 text-xs text-muted">
                          Tx: <span className="break-all font-mono">{record.txHash}</span>
                          {explorerLink ? (
                            <>
                              {" "}
                              <a className="font-semibold" href={explorerLink} target="_blank" rel="noreferrer">
                                Explorer
                              </a>
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "revocations"}>
        <Card>
          <CardHeader title="Revocation Panel" subtitle="Revoke issued credentials with explicit reason trails." />
          <CardBody className="space-y-3">
            <Input
              id="issuerRevokeHash"
              label="Credential hash"
              value={revokeHash}
              onChange={(event) => setRevokeHash(event.target.value)}
              placeholder="0x..."
            />
            <Textarea
              id="issuerRevokeReason"
              label="Revocation reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              rows={2}
            />
            <Button type="button" variant="danger" loading={submitting} onClick={handleRevoke}>
              Revoke credential
            </Button>
          </CardBody>
        </Card>
      </Section>
    </>
  );
}