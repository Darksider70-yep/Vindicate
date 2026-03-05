import { CheckCircle, Search } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";

const VerifierDashboard = () => {
  const navItems = [
    { href: "/dashboard", label: "Fast Verify", icon: Search },
    { href: "/dashboard/result", label: "Result", icon: CheckCircle },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <h1 className="text-3xl font-bold">Verifier Dashboard</h1>
      <p>Quickly verify credentials.</p>
    </DashboardLayout>
  );
};

export default VerifierDashboard;
