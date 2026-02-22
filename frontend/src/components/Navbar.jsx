import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav style={{
      padding: "16px 32px",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "32px",
      display: "flex",
      gap: "24px",
      justifyContent: "center",
      fontWeight: 500
    }}>
      <Link to="/">Home</Link>
      <Link to="/dashboard">Issue</Link>
      <Link to="/explorer">Explorer</Link>
      <Link to="/verify">Verify</Link>
    </nav>
  );
}

export default Navbar;
