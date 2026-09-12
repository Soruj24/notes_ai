import { redirect } from "next/navigation";

export default function ProbePage() {
  redirect("/dashboard");
  return <p>probe</p>;
}
