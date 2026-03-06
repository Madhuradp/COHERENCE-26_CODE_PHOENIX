import { PatientLayout } from "@/components/layout/PatientLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PatientLayout>{children}</PatientLayout>;
}
