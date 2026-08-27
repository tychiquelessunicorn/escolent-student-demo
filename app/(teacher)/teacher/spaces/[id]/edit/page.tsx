import { TeacherSpaceEditor } from "@/components/teacher-space-editor";

export const metadata = { title: "Edit Space · Escolent" };

export default async function TeacherEditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeacherSpaceEditor mode="edit" spaceId={id} />;
}
