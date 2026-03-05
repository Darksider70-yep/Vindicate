import { Wallet, Share2, QrCode } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";

const StudentDashboard = () => {
  const navItems = [
    { href: "/dashboard", label: "My Credentials", icon: Wallet },
    { href: "/dashboard/share", label: "Share", icon: Share2 },
    { href: "/dashboard/qr", label: "Generate QR", icon: QrCode },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      <p>Welcome to your personal credential wallet.</p>
    </DashboardLayout>
  );
};

export default StudentDashboard;
