import { Shield, BookOpen, Users, LogOut, CheckCircle } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge } from "../../components/ui/Badge";

const InstitutionAdminDashboard = () => {
  const navItems = [
    { href: "/dashboard", label: "Overview", icon: Shield },
    { href: "/dashboard/issuance", label: "Issuance", icon: BookOpen },
    { href: "/dashboard/issuers", label: "Issuers", icon: Users },
    { href: "/dashboard/revocation", label: "Revocation", icon: LogOut },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Institution Admin Dashboard</h1>
        <Badge variant="primary">
          <CheckCircle className="mr-2 h-4 w-4" />
          Verified Institution
        </Badge>
      </div>
      <p className="mt-4">Welcome to the Institution Admin Dashboard.</p>
    </DashboardLayout>
  );
};

export default InstitutionAdminDashboard;
