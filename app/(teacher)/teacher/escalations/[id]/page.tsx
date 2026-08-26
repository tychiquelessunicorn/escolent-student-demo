import { EscalationDetailScreen } from "@/components/escalation-detail-screen";

export default async function TeacherEscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EscalationDetailScreen escalationId={id} />;
}
