import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function Explorer() {
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    setCredentials([
      {
        id: "1",
        holder: "Alice Walker",
        domain: "Blockchain Engineering",
        institution: "MIT",
        hash: "0x0c5f7f4f9360f8399e27252d43c7af78af65f6388dfd5db8c64a7f6ad5c4d10a",
        status: "ACTIVE"
      },
      {
        id: "2",
        holder: "Bob Rivera",
        domain: "AI Systems",
        institution: "Stanford",
        hash: "0x49b03ea4ea9f280d4e049f7ef680974f23f45d6ae58fdf2f61391343ebccf349",
        status: "ACTIVE"
      },
      {
        id: "3",
        holder: "Priya Menon",
        domain: "Cybersecurity",
        institution: "NUS",
        hash: "0x1f72bcb0aa67103b1adba31118979a25c56ffdb088f453ea8fe89f95f1efaf9c",
        status: "REVOKED"
      }
    ]);
  }, []);

  return (
    <PageContainer className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader
          title="Credential Explorer"
          subtitle="Public listing preview for ecosystem transparency and demo workflows."
        />
        <CardBody>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Holder</th>
                  <th className="px-3 py-2">Domain</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Credential hash</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((credential) => (
                  <tr key={credential.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-semibold text-text">{credential.holder}</td>
                    <td className="px-3 py-2 text-muted">{credential.domain}</td>
                    <td className="px-3 py-2">{credential.institution}</td>
                    <td className="px-3 py-2">
                      <Badge tone={credential.status === "REVOKED" ? "danger" : "success"}>{credential.status}</Badge>
                    </td>
                    <td className="max-w-44 px-3 py-2 break-all font-mono text-xs text-muted">{credential.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}