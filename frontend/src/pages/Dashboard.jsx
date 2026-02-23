import { useEffect, useState } from "react";
import { ROLES } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import {
  approveInstitution,
  approveIssuer,
  assignRole,
  getIssuers,
  listInstitutions,
  rejectInstitution,
  rejectIssuer,
  removeIssuer,
  requestInstitution,
  requestIssuerRole,
  requestWalletRotation
} from "../utils/api";

function Panel({ title, children }) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px"
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: "10px" }}>
      <span style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "9px 10px",
        borderRadius: "8px",
        border: "1px solid #d1d5db"
      }}
    />
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [issuerInstitutionId, setIssuerInstitutionId] = useState("");
  const [rotationWallet, setRotationWallet] = useState("");
  const [rotationReason, setRotationReason] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [issuers, setIssuers] = useState([]);

  const [roleWallet, setRoleWallet] = useState("");
  const [roleValue, setRoleValue] = useState(ROLES.VERIFIER);
  const [roleInstitutionId, setRoleInstitutionId] = useState("");

  const [institutionName, setInstitutionName] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [institutionAdminWallet, setInstitutionAdminWallet] = useState("");
  const [institutionReviewId, setInstitutionReviewId] = useState("");
  const [institutionReviewNotes, setInstitutionReviewNotes] = useState("");

  const [issuerReviewId, setIssuerReviewId] = useState("");
  const [issuerReviewNotes, setIssuerReviewNotes] = useState("");

  const refreshGovernanceData = async () => {
    try {
      const [issuerList, institutionList] = await Promise.all([
        getIssuers(),
        listInstitutions()
      ]);
      setIssuers(issuerList);
      setInstitutions(institutionList);
    } catch {
      // Dashboard can still be used without list data.
    }
  };

  useEffect(() => {
    if (
      user?.role === ROLES.SUPER_ADMIN ||
      user?.role === ROLES.INSTITUTION_ADMIN ||
      user?.role === ROLES.VERIFIER
    ) {
      refreshGovernanceData();
    }
  }, [user?.role]);

  const runAction = async (action, successMessage) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
      await refreshGovernanceData();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", padding: "0 14px 40px" }}>
      <h2 style={{ marginBottom: "8px" }}>Identity & Trust Governance</h2>
      <p style={{ marginTop: 0, color: "#475569" }}>
        Wallet: <code>{user.walletAddress}</code> | Role: <strong>{user.role}</strong>
      </p>

      {message && (
        <div
          style={{
            marginBottom: "12px",
            border: "1px solid #16a34a",
            background: "#f0fdf4",
            color: "#166534",
            padding: "10px",
            borderRadius: "8px"
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          style={{
            marginBottom: "12px",
            border: "1px solid #dc2626",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "10px",
            borderRadius: "8px"
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: "14px" }}>
        <Panel title="Issuer Role Request">
          <Row label="Institution ID">
            <TextInput
              value={issuerInstitutionId}
              onChange={(event) => setIssuerInstitutionId(event.target.value)}
              placeholder="institution id"
            />
          </Row>
          <button
            type="button"
            onClick={() =>
              runAction(
                () => requestIssuerRole(issuerInstitutionId),
                "Issuer request submitted"
              )
            }
          >
            Request VERIFIED_ISSUER role
          </button>
        </Panel>

        <Panel title="Wallet Rotation Request">
          <Row label="New Wallet Address">
            <TextInput
              value={rotationWallet}
              onChange={(event) => setRotationWallet(event.target.value)}
              placeholder="0x..."
            />
          </Row>
          <Row label="Reason">
            <TextInput
              value={rotationReason}
              onChange={(event) => setRotationReason(event.target.value)}
              placeholder="Compromised wallet or key rotation reason"
            />
          </Row>
          <button
            type="button"
            onClick={() =>
              runAction(
                () => requestWalletRotation(rotationWallet, rotationReason),
                "Wallet rotation request submitted"
              )
            }
          >
            Submit wallet rotation request
          </button>
        </Panel>

        {user.role === ROLES.SUPER_ADMIN && (
          <Panel title="Admin Role Assignment">
            <Row label="Target Wallet">
              <TextInput
                value={roleWallet}
                onChange={(event) => setRoleWallet(event.target.value)}
                placeholder="0x..."
              />
            </Row>
            <Row label="Role">
              <select
                value={roleValue}
                onChange={(event) => setRoleValue(event.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db"
                }}
              >
                <option value={ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
                <option value={ROLES.INSTITUTION_ADMIN}>INSTITUTION_ADMIN</option>
                <option value={ROLES.VERIFIER}>VERIFIER</option>
                <option value={ROLES.STUDENT}>STUDENT</option>
              </select>
            </Row>
            <Row label="Institution ID (required for INSTITUTION_ADMIN)">
              <TextInput
                value={roleInstitutionId}
                onChange={(event) => setRoleInstitutionId(event.target.value)}
                placeholder="institution id"
              />
            </Row>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => assignRole(roleWallet, roleValue, roleInstitutionId || undefined),
                  "Role assignment synced"
                )
              }
            >
              Assign role
            </button>
          </Panel>
        )}

        {user.role === ROLES.SUPER_ADMIN && (
          <Panel title="Institution Onboarding">
            <Row label="Institution Name">
              <TextInput
                value={institutionName}
                onChange={(event) => setInstitutionName(event.target.value)}
              />
            </Row>
            <Row label="Institution Code">
              <TextInput
                value={institutionCode}
                onChange={(event) => setInstitutionCode(event.target.value)}
                placeholder="short_code"
              />
            </Row>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => requestInstitution(institutionName, institutionCode),
                  "Institution request created"
                )
              }
              style={{ marginRight: "8px" }}
            >
              Create request
            </button>

            <hr style={{ margin: "14px 0" }} />
            <Row label="Institution ID">
              <TextInput
                value={institutionReviewId}
                onChange={(event) => setInstitutionReviewId(event.target.value)}
              />
            </Row>
            <Row label="Admin Wallet">
              <TextInput
                value={institutionAdminWallet}
                onChange={(event) => setInstitutionAdminWallet(event.target.value)}
                placeholder="0x..."
              />
            </Row>
            <Row label="Review Notes">
              <TextInput
                value={institutionReviewNotes}
                onChange={(event) => setInstitutionReviewNotes(event.target.value)}
              />
            </Row>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () =>
                    approveInstitution(
                      institutionReviewId,
                      institutionAdminWallet,
                      institutionReviewNotes || undefined
                    ),
                  "Institution approved and role synced on-chain"
                )
              }
              style={{ marginRight: "8px" }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => rejectInstitution(institutionReviewId, institutionReviewNotes || undefined),
                  "Institution rejected"
                )
              }
            >
              Reject
            </button>
          </Panel>
        )}

        {(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.INSTITUTION_ADMIN) && (
          <Panel title="Issuer Approval Governance">
            <Row label="Issuer Request ID">
              <TextInput
                value={issuerReviewId}
                onChange={(event) => setIssuerReviewId(event.target.value)}
              />
            </Row>
            <Row label="Review Notes">
              <TextInput
                value={issuerReviewNotes}
                onChange={(event) => setIssuerReviewNotes(event.target.value)}
              />
            </Row>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => approveIssuer(issuerReviewId, issuerReviewNotes || undefined),
                  "Issuer approved and ISSUER_ROLE synced on-chain"
                )
              }
              style={{ marginRight: "8px" }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => rejectIssuer(issuerReviewId, issuerReviewNotes || undefined),
                  "Issuer request rejected"
                )
              }
              style={{ marginRight: "8px" }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => removeIssuer(issuerReviewId, issuerReviewNotes || undefined),
                  "Issuer removed and on-chain role revoked"
                )
              }
            >
              Remove
            </button>
          </Panel>
        )}

        {(institutions.length > 0 || issuers.length > 0) && (
          <Panel title="Governance Snapshot">
            <p style={{ marginBottom: "4px" }}>
              Institutions tracked: <strong>{institutions.length}</strong>
            </p>
            <p style={{ marginTop: 0 }}>
              Issuer requests tracked: <strong>{issuers.length}</strong>
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
