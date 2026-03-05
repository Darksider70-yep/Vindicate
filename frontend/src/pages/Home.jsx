import Container from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <Container className="py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight lg:text-6xl">
        Decentralized Trust.
        <br />
        <span className="text-primary">Verified Credentials.</span>
      </h1>
      <p className="mt-6 text-lg text-muted">
        Vindicate is a decentralized platform for issuing, holding, and
        verifying credentials with cryptographic proof.
      </p>
      <div className="mt-8 flex justify-center space-x-4">
        <Button asChild size="lg">
          <Link to="/dashboard">Get Started</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to="/explorer">Explore Credentials</Link>
        </Button>
      </div>
    </Container>
  );
};

export default Home;
