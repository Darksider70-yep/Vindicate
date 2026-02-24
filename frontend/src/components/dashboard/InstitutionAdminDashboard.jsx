import { useMemo, useState } from "react";
import {
  approveInstitution,
  approveIssuer,
  assignRole,
  emergencyRevokeCredential,
  rejectInstitution,
  rejectIssuer,
  removeIssuer,
  requestInstitution,
  revokeCredential
} from "../../utils/api";
import { ROLES } from "../../constants/roles";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, formatRelativePercent } from "../../utils/ui";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Input, Select, Textarea } from "../ui/Input";
import StatCard from "../ui/StatCard";

function Section({ hidden, children }) {
  if (hidden) {
    return null;
  }

  return <div className="space-y-4">{children}</div>;
}

export default function InstitutionAdminDashboard({
  activeSection,
  user,
  institutions,
  issuers,
  refreshGovernance
}) {
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  const [roleWallet, setRoleWallet] = useState("");
  const [roleValue, setRoleValue] = useState(ROLES.VERIFIER);
  const [roleInstitutionId, setRoleInstitutionId] = useState("");

  const [institutionName, setInstitutionName] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [institutionReviewId, setInstitutionReviewId] = useState("");
  const [institutionAdminWallet, setInstitutionAdminWallet] = useState("");
  const [institutionReviewNotes, setInstitutionReviewNotes] = useState("");

  const [issuerReviewId, setIssuerReviewId] = useState("");
  const [issuerReviewNotes, setIssuerReviewNotes] = useState("");

  const [revokeHash, setRevokeHash] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [emergencyMode, setEmergencyMode] = useState(false);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const stats = useMemo(() => {
    const approvedInstitutions = institutions.filter((item) => item.status === "APPROVED").length;
    const pendingInstitutions = institutions.filter((item) => item.status === "PENDING").length;
    const activeIssuers = issuers.filter((item) => item.status === "ACTIVE" && item.approved).length;
    const pendingIssuers = issuers.filter((item) => item.status === "PENDING").length;
    const revocationRisk = issuers.length ? (pendingIssuers / issuers.length) * 100 : 0;

    return {
      approvedInstitutions,
      pendingInstitutions,
      activeIssuers,
      pendingIssuers,
      revocationRisk
    };
  }, [institutions, issuers]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      pushToast(successMessage, "success");
      await refreshGovernance();
    } catch (error) {
      pushToast(error.message || "Action failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section hidden={activeSection !== "overview"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Approved Institutions" value={stats.approvedInstitutions} helper="Governance-approved entities" />
          <StatCard title="Pending Institutions" value={stats.pendingInstitutions} helper="Awaiting review decision" />
          <StatCard title="Active Issuers" value={stats.activeIssuers} helper="On-chain enabled issuers" />
          <StatCard title="Pending Issuer Requests" value={stats.pendingIssuers} helper="Queue requiring action" />
          <StatCard
            title="Governance Risk Index"
            value={formatRelativePercent(stats.revocationRisk)}
            helper="Pending / total issuer ratio"
          />
        </div>

        <Card>
          <CardHeader
            title="Issuance Analytics"
            subtitle="Operational quality indicators for institutional governance."
          />
          <CardBody className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Issuer Approval Velocity</p>
              <p className="mt-1 text-xl font-semibold text-text">{stats.activeIssuers > 0 ? "Healthy" : "Low"}</p>
              <p className="mt-1 text-xs text-muted">Monitor approval cadence with revocation ratios.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Revocation Readiness</p>
              <p className="mt-1 text-xl font-semibold text-text">{emergencyMode ? "Emergency" : "Standard"}</p>
              <p className="mt-1 text-xs text-muted">Switch only for severe trust incidents.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Policy Drift Monitor</p>
              <p className="mt-1 text-xl font-semibold text-text">
                {stats.pendingInstitutions + stats.pendingIssuers > 8 ? "Needs attention" : "Stable"}
              </p>
              <p className="mt-1 text-xs text-muted">High pending volume indicates governance lag.</p>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "revocations"}>
        <Card>
          <CardHeader
            title="Revocation Management"
            subtitle="Immediate credential invalidation workflows with optional emergency override."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="revokeHash"
                label="Credential hash"
                value={revokeHash}
                onChange={(event) => setRevokeHash(event.target.value)}
                placeholder="0x..."
              />
              <Textarea
                id="revokeReason"
                label="Reason"
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                rows={1}
                placeholder="Compliance or integrity rationale"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-panel p-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  checked={emergencyMode}
                  onChange={(event) => setEmergencyMode(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Emergency override mode
              </label>

              <Button
                type="button"
                variant={emergencyMode ? "danger" : "primary"}
                loading={busy}
                onClick={() =>
                  runAction(
                    () =>
                      emergencyMode
                        ? emergencyRevokeCredential({ credentialHash: revokeHash.trim(), reason: revokeReason.trim() })
                        : revokeCredential({ credentialHash: revokeHash.trim(), reason: revokeReason.trim() }),
                    emergencyMode ? "Emergency revocation submitted." : "Credential revoked."
                  )
                }
              >
                {emergencyMode ? "Run emergency revoke" : "Revoke credential"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "issuers"}>
        <Card>
          <CardHeader title="Issuer Governance" subtitle="Review and manage issuer lifecycle actions." />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="issuerRequestId"
                label="Issuer request ID"
                value={issuerReviewId}
                onChange={(event) => setIssuerReviewId(event.target.value)}
                placeholder="issuer-request-id"
              />
              <Textarea
                id="issuerNotes"
                label="Review notes"
                value={issuerReviewNotes}
                onChange={(event) => setIssuerReviewNotes(event.target.value)}
                rows={1}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                loading={busy}
                onClick={() =>
                  runAction(
                    () => approveIssuer(issuerReviewId.trim(), issuerReviewNotes.trim() || undefined),
                    "Issuer approved and synced on-chain."
                  )
                }
              >
                Approve issuer
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={busy}
                onClick={() =>
                  runAction(
                    () => rejectIssuer(issuerReviewId.trim(), issuerReviewNotes.trim() || undefined),
                    "Issuer request rejected."
                  )
                }
              >
                Reject issuer
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={busy}
                onClick={() =>
                  runAction(
                    () => removeIssuer(issuerReviewId.trim(), issuerReviewNotes.trim() || undefined),
                    "Issuer removed and chain role revoked."
                  )
                }
              >
                Remove issuer
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Wallet</th>
                    <th className="px-3 py-2">Institution</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {issuers.map((issuer) => (
                    <tr key={issuer.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs text-muted">{issuer.walletAddress}</td>
                      <td className="px-3 py-2">{issuer.institution?.name || issuer.institutionId}</td>
                      <td className="px-3 py-2">
                        <Badge tone={issuer.status === "ACTIVE" ? "success" : issuer.status === "PENDING" ? "warning" : "neutral"}>
                          {issuer.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted">{formatDateTime(issuer.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "institutions" || !isSuperAdmin}>
        <Card>
          <CardHeader
            title="Institution Onboarding"
            subtitle="Create institution requests and execute approval governance."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="institutionName"
                label="Institution name"
                value={institutionName}
                onChange={(event) => setInstitutionName(event.target.value)}
              />
              <Input
                id="institutionCode"
                label="Institution code"
                value={institutionCode}
                onChange={(event) => setInstitutionCode(event.target.value)}
                placeholder="short_code"
              />
            </div>

            <Button
              type="button"
              loading={busy}
              onClick={() =>
                runAction(
                  () => requestInstitution(institutionName.trim(), institutionCode.trim()),
                  "Institution request created."
                )
              }
            >
              Create onboarding request
            </Button>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                id="institutionReviewId"
                label="Institution ID"
                value={institutionReviewId}
                onChange={(event) => setInstitutionReviewId(event.target.value)}
              />
              <Input
                id="institutionAdminWallet"
                label="Admin wallet"
                value={institutionAdminWallet}
                onChange={(event) => setInstitutionAdminWallet(event.target.value)}
                placeholder="0x..."
              />
              <Textarea
                id="institutionReviewNotes"
                label="Review notes"
                value={institutionReviewNotes}
                onChange={(event) => setInstitutionReviewNotes(event.target.value)}
                rows={1}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                loading={busy}
                onClick={() =>
                  runAction(
                    () =>
                      approveInstitution(
                        institutionReviewId.trim(),
                        institutionAdminWallet.trim(),
                        institutionReviewNotes.trim() || undefined
                      ),
                    "Institution approved with chain role grant."
                  )
                }
              >
                Approve institution
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={busy}
                onClick={() =>
                  runAction(
                    () => rejectInstitution(institutionReviewId.trim(), institutionReviewNotes.trim() || undefined),
                    "Institution rejected."
                  )
                }
              >
                Reject institution
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Institution</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((institution) => (
                    <tr key={institution.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{institution.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">{institution.code}</td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            institution.status === "APPROVED"
                              ? "success"
                              : institution.status === "PENDING"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {institution.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted">{formatDateTime(institution.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section hidden={activeSection !== "roles" || !isSuperAdmin}>
        <Card>
          <CardHeader
            title="Role Assignment"
            subtitle="Map wallets to protocol roles with optional institution binding."
          />
          <CardBody className="grid gap-3 md:grid-cols-3">
            <Input
              id="roleWallet"
              label="Target wallet"
              value={roleWallet}
              onChange={(event) => setRoleWallet(event.target.value)}
              placeholder="0x..."
            />
            <Select id="roleValue" label="Role" value={roleValue} onChange={(event) => setRoleValue(event.target.value)}>
              <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
              <option value={ROLES.INSTITUTION_ADMIN}>INSTITUTION_ADMIN</option>
              <option value={ROLES.VERIFIED_ISSUER}>VERIFIED_ISSUER</option>
              <option value={ROLES.VERIFIER}>VERIFIER</option>
              <option value={ROLES.STUDENT}>STUDENT</option>
            </Select>
            <Input
              id="roleInstitutionId"
              label="Institution ID"
              value={roleInstitutionId}
              onChange={(event) => setRoleInstitutionId(event.target.value)}
              placeholder="Required for INSTITUTION_ADMIN"
            />
            <div className="md:col-span-3">
              <Button
                type="button"
                loading={busy}
                onClick={() =>
                  runAction(
                    () => assignRole(roleWallet.trim(), roleValue, roleInstitutionId.trim() || undefined),
                    "Role assignment synced on-chain."
                  )
                }
              >
                Assign role
              </Button>
            </div>
          </CardBody>
        </Card>
      </Section>
    </>
  );
}