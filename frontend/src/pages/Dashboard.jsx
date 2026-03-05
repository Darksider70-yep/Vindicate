import { useAuth } from "../context/AuthContext";
import InstitutionAdminDashboard from "./dashboards/InstitutionAdminDashboard";
import IssuerDashboard from "./dashboards/IssuerDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import VerifierDashboard from "./dashboards/VerifierDashboard";

const Dashboard = () => {
  const { role } = useAuth();

  switch (role) {
    case "institution":
      return <InstitutionAdminDashboard />;
    case "issuer":
      return <IssuerDashboard />;
    case "student":
      return <StudentDashboard />;
    case "verifier":
      return <VerifierDashboard />;
    default:
      // You can also have a default dashboard or a loading state
      return <div>Loading Dashboard...</div>;
  }
};

export default Dashboard;
