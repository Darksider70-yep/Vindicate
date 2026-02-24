import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <PageContainer>
      <Card>
        <CardBody className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold text-text">Page not found</h1>
          <p className="text-sm text-muted">The route you requested is not available.</p>
          <div>
            <Link to="/">
              <Button type="button">Return home</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}