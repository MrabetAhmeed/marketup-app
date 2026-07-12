import { redirect } from "next/navigation";

export default function ValidationComptesPage(): never {
  redirect("/admin/validation?tab=inscriptions");
}
