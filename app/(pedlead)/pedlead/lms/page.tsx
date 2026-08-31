import { PedleadLmsIngestionScreen } from "@/components/pedlead-lms-ingestion-screen";

export const metadata = {
  title: "LMS Content Ingestion · Escolent Pedagogical Lead",
  description: "Read-only course material ingestion and automated diagram OCR parsing from Canvas LMS.",
};

export default function PedleadLmsPage() {
  return <PedleadLmsIngestionScreen />;
}
