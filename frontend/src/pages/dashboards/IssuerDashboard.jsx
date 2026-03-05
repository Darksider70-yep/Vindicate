import { PlusCircle, List, AlertTriangle } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";

const IssuerDashboard = () => {
  const navItems = [
    { href: "/dashboard", label: "Issue Credential", icon: PlusCircle },
    { href: "/dashboard/issued", label: "Issued", icon: List },
    { href: "/dashboard/revoke", label: "Revoke", icon: AlertTriangle },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <h1 className="text-3xl font-bold">Issuer Dashboard</h1>
      <p>Welcome to the Issuer Dashboard.</p>
    </DashboardLayout>
  );
};

export default IssuerDashboard;
