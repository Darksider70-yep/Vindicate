import { useEffect, useMemo, useState } from "react";
import { getCredentialQr, getStudentByAddress } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { useClipboard } from "../../hooks/useClipboard";
import { formatDateTime } from "../../utils/ui";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import Modal from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";

function Section({ hidden, children }) {
  if (hidden) {
    return null;
  }

  return <div className="space-y-4">{children}</div>;
}

export default function StudentDashboard({ activeSection, user }) {
  const { pushToast } = useToast();
  const { copy, copied } = useClipboard();

  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadStudent = async () => {
      if (!user?.walletAddress) {
        return;
      }

      setLoading(true);
      try {
        const data = await getStudentByAddress(user.walletAddress);
        if (mounted) {
          setStudent(data);
        }
      } catch (error) {
        if (mounted) {
          pushToast(error.message || "Unable to load student credentials.", "error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStudent();

    return () => {
      mounted = false;
    };
  }, [pushToast, user?.walletAddress]);

  const credentials = useMemo(() => student?.studentCredentials || [], [student?.studentCredentials]);

  const handleShare = async (credentialHash) => {
    const url = `${window.location.origin}/verify/${credentialHash}`;

    try {
      await copy(url);
      pushToast("Verification link copied.", "success");
    } catch {
      pushToast("Clipboard access denied.", "error");
    }
  };

  const openQr = async (credentialHash) => {
    setSelectedCredential(credentialHash);
    setQrLoading(true);

    try {
      const data = await getCredentialQr(credentialHash);
      setQrData(data);
    } catch (error) {
      pushToast(error.message || "Unable to generate QR.", "error");
      setSelectedCredential(null);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <>
      <Section hidden={activeSection !== "overview"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Owned credentials</p>
            <p className="mt-1 text-2xl font-semibold text-text">{credentials.length}</p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Active credentials</p>
            <p className="mt-1 text-2xl font-semibold text-text">
              {credentials.filter((item) => item.status !== "REVOKED").length}
            </p>
          </article>
          <article className="metric-tile">
            <p className="text-xs uppercase tracking-wide text-muted">Wallet portability</p>
            <p className="mt-1 text-sm font-semibold text-text break-all">{student?.walletAddress || user?.walletAddress}</p>
          </article>
        </div>
      </Section>

      <Section hidden={activeSection !== "credentials"}>
        <Card>
          <CardHeader
            title="Owned Credentials"
            subtitle="Portable records linked to your decentralized identity."
          />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : credentials.length === 0 ? (
              <p className="text-sm text-muted">No credentials issued yet for this wallet.</p>
            ) : (
              <div className="space-y-3">
                {credentials.map((credential) => (
                  <article key={credential.id} className="rounded-xl border border-border/70 bg-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-text">{credential.fileName || "Credential Record"}</h4>
                      <Badge tone={credential.status === "REVOKED" ? "danger" : "success"}>{credential.status}</Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted">Institution: {credential.institution?.name || credential.institutionId}</p>
                    <p className="text-xs text-muted">Issued: {formatDateTime(credential.issuedAt)}</p>
                    <p className="mt-2 break-all font-mono text-xs text-text">{credential.credentialHash}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => handleShare(credential.credentialHash)}>
                        Share link
                      </Button>
                      <Button type="button" size="sm" onClick={() => openQr(credential.credentialHash)}>
                        Generate QR
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "share"}>
        <Card>
          <CardHeader title="Share and Portability" subtitle="Use verification URLs and QR codes for employer workflows." />
          <CardBody className="space-y-3 text-sm text-muted">
            <p>1. Use "Share link" to copy a direct verification URL.</p>
            <p>2. Use "Generate QR" to provide a scannable credential verification path.</p>
            <p>3. Verification remains independent from any single institution portal.</p>
            {copied ? <Badge tone="success">Link copied to clipboard</Badge> : null}
          </CardBody>
        </Card>
      </Section>

      <Modal
        open={Boolean(selectedCredential)}
        onClose={() => {
          setSelectedCredential(null);
          setQrData(null);
        }}
        title="Credential QR"
        description="Portable verification token"
      >
        {qrLoading ? (
          <Skeleton className="h-64" />
        ) : qrData ? (
          <div className="space-y-3">
            <img src={qrData.qrDataUrl} alt="Credential verification QR" className="mx-auto h-64 w-64 rounded-xl border border-border/70" />
            <p className="break-all text-xs text-muted">{qrData.verificationUrl}</p>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  copy(qrData.verificationUrl)
                    .then(() => pushToast("Verification URL copied.", "success"))
                    .catch(() => pushToast("Clipboard unavailable.", "error"));
                }}
              >
                Copy URL
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}