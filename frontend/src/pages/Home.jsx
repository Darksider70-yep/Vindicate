import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Card, CardBody } from "../components/ui/Card";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getHealth } from "../utils/api";

export default function Home() {
  const { user, authenticating, loginWithWallet, hasEthereumProvider } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState("checking");

  const handleLogin = async () => {
    if (!hasEthereumProvider) {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      pushToast("Install MetaMask to continue.", "warning");
      return;
    }

    try {
      await loginWithWallet();
      pushToast("Authentication successful.", "success");
      navigate("/dashboard");
    } catch (error) {
      pushToast(error.message || "Wallet authentication failed.", "error");
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        await getHealth();
        if (mounted) {
          setBackendStatus("online");
        }
      } catch {
        if (mounted) {
          setBackendStatus("offline");
        }
      }
    };

    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageContainer className="space-y-4 lg:space-y-6">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <Badge tone="primary">Decentralized Credential Infrastructure</Badge>
            <h1 className="text-3xl font-semibold leading-tight text-text md:text-5xl">
              Enterprise trust, open standards, and instant credential verification.
            </h1>
            <p className="max-w-2xl text-sm text-muted md:text-base">
              Vindicate is built for universities, certifiers, employers, and global mobility systems. Every credential is
              auditable, portable, and privacy-preserving.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <Button type="button" size="lg" onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
              ) : (
                <Button type="button" size="lg" loading={authenticating} onClick={handleLogin}>
                  {hasEthereumProvider ? "Sign in with Ethereum" : "Install MetaMask"}
                </Button>
              )}
              <Button type="button" variant="secondary" size="lg" onClick={() => navigate("/verify")}>Verify credential</Button>
            </div>
          </div>

          <div className="rounded-xxl border border-border/80 bg-panel p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Operational Signals</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border/70 bg-surface p-3">
                <p className="text-xs text-muted">Backend</p>
                <p className="mt-1 text-sm font-semibold text-text">{backendStatus}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface p-3">
                <p className="text-xs text-muted">Governance</p>
                <p className="mt-1 text-sm font-semibold text-text">On-chain role enforcement active</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface p-3">
                <p className="text-xs text-muted">Integrity</p>
                <p className="mt-1 text-sm font-semibold text-text">Blockchain + DB + IPFS tri-verification</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-lg font-semibold text-text">Institution Console</h2>
            <p className="text-sm text-muted">Govern issuer lifecycle, revocations, and audit trails.</p>
            <Link to="/dashboard" className="text-sm font-semibold">Open dashboard</Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-lg font-semibold text-text">Issuer Workflow</h2>
            <p className="text-sm text-muted">Issue and anchor records with transparent transaction proofs.</p>
            <Link to="/dashboard" className="text-sm font-semibold">Start issuance</Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-lg font-semibold text-text">Student Portability</h2>
            <p className="text-sm text-muted">Share credentials with secure URLs and QR verification.</p>
            <Link to="/dashboard" className="text-sm font-semibold">Open wallet view</Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-lg font-semibold text-text">Verifier Experience</h2>
            <p className="text-sm text-muted">Fast hash lookup, trust scoring, and integrity timeline.</p>
            <Link to="/verify" className="text-sm font-semibold">Launch verifier</Link>
          </CardBody>
        </Card>
      </section>
    </PageContainer>
  );
}