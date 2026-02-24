import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageSkeleton } from "./ui/Skeleton";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}