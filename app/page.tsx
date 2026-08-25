import { redirect } from "next/navigation";

// Requirement 7.1: opening the Platform begins a Session directly. There is no
// landing menu for a Student to choose from.
export default function Home() {
  redirect("/practice");
}
