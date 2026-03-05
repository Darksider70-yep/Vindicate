import { Link } from "react-router-dom";
import Container from "../components/layout/Container";
import { Button } from "../components/ui/Button";

const NotFound = () => {
  return (
    <Container className="py-20 text-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-muted">
        The page you are looking for does not exist.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    </Container>
  );
};

export default NotFound;
