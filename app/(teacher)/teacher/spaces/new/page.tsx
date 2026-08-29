import { TeacherSpaceEditor } from "@/components/teacher-space-editor";

export const metadata = { title: "New Space · Escolent" };

export default function TeacherNewSpacePage() {
  return <TeacherSpaceEditor mode="create" />;
}
