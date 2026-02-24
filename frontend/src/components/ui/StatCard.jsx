import { Card, CardBody } from "./Card";

export default function StatCard({ title, value, helper }) {
  return (
    <Card className="metric-tile">
      <CardBody className="space-y-1 p-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <p className="text-2xl font-semibold text-text">{value}</p>
        {helper ? <p className="text-xs text-muted">{helper}</p> : null}
      </CardBody>
    </Card>
  );
}