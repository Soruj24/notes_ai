import type { Metadata } from "next";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

/** Server wrapper: form logic lives in RegisterForm. */
export default function RegisterPage() {
  return <RegisterForm />;
}
