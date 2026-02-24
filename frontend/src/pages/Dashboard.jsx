import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLES } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getIssuers, listInstitutions } from "../utils/api";
import { shortAddress } from "../utils/ui";
import DashboardLayout from "../components/layout/DashboardLayout";
import InstitutionAdminDashboard from "../components/dashboard/InstitutionAdminDashboard";
import IssuerDashboard from "../components/dashboard/IssuerDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";
import VerifierDashboard from "../components/dashboard/VerifierDashboard";
import { PageSkeleton } from "../components/ui/Skeleton";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

const SECTION_MAP = {
  [ROLES.SUPER_ADMIN]: [
    { id: "overview", shortLabel: "OV", label: "Overview" },
    { id: "revocations", shortLabel: "RV", label: "Revocations" },
    { id: "issuers", shortLabel: "IS", label: "Issuer Management" },
    { id: "institutions", shortLabel: "IN", label: "Institutions" },
    { id: "roles", shortLabel: "RL", label: "Role Control" }
  ],
  [ROLES.INSTITUTION_ADMIN]: [
    { id: "overview", shortLabel: "OV", label: "Overview" },
    { id: "revocations", shortLabel: "RV", label: "Revocations" },
    { id: "issuers", shortLabel: "IS", label: "Issuer Management" }
  ],
  [ROLES.VERIFIED_ISSUER]: [
    { id: "overview", shortLabel: "OV", label: "Overview" },
    { id: "issue", shortLabel: "IQ", label: "Issue Credential" },
    { id: "issued", shortLabel: "LS", label: "Issued List" },
    { id: "revocations", shortLabel: "RV", label: "Revocations" }
  ],
  [ROLES.STUDENT]: [
    { id: "overview", shortLabel: "OV", label: "Overview" },
    { id: "credentials", shortLabel: "CR", label: "Owned Credentials" },
    { id: "share", shortLabel: "SH", label: "Share & QR" }
  ],
  [ROLES.VERIFIER]: [
    { id: "overview", shortLabel: "OV", label: "Overview" },
    { id: "workbench", shortLabel: "VF", label: "Verification Workbench" }
  ]
};

export default function Dashboard() {
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [issuers, setIssuers] = useState([]);

  const sections = useMemo(() => SECTION_MAP[user?.role] || SECTION_MAP[ROLES.VERIFIER], [user?.role]);

  const shouldLoadGovernance = useMemo(
    () =>
      user?.role === ROLES.SUPER_ADMIN ||
      user?.role === ROLES.INSTITUTION_ADMIN ||
      user?.role === ROLES.VERIFIER,
    [user?.role]
  );

  const refreshGovernance = useCallback(async () => {
    if (!shouldLoadGovernance) {
      return;
    }

    setLoading(true);
    try {
      const [institutionData, issuerData] = await Promise.all([listInstitutions(), getIssuers()]);
      setInstitutions(institutionData);
      setIssuers(issuerData);
    } catch (error) {
      pushToast(error.message || "Failed to load governance datasets.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast, shouldLoadGovernance]);

  useEffect(() => {
    refreshGovernance();
  }, [refreshGovernance]);

  if (loading && shouldLoadGovernance && institutions.length === 0 && issuers.length === 0) {
    return <PageSkeleton />;
  }

  const subtitle = `Wallet ${shortAddress(user?.walletAddress || "-")} | Role ${user?.role || "-"}`;

  return (
    <DashboardLayout title="Operations Dashboard" subtitle={subtitle} sections={sections}>
      {(activeSection) => {
        if (user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.INSTITUTION_ADMIN) {
          return (
            <InstitutionAdminDashboard
              user={user}
              activeSection={activeSection}
              institutions={institutions}
              issuers={issuers}
              refreshGovernance={refreshGovernance}
            />
          );
        }

        if (user?.role === ROLES.VERIFIED_ISSUER) {
          return <IssuerDashboard user={user} activeSection={activeSection} />;
        }

        if (user?.role === ROLES.STUDENT) {
          return <StudentDashboard user={user} activeSection={activeSection} />;
        }

        if (user?.role === ROLES.VERIFIER) {
          return <VerifierDashboard activeSection={activeSection} />;
        }

        return (
          <Card>
            <CardHeader title="Unsupported Role" subtitle="This role has no dashboard module yet." />
            <CardBody>
              <p className="text-sm text-muted">Contact governance admin to configure this account.</p>
            </CardBody>
          </Card>
        );
      }}
    </DashboardLayout>
  );
}
