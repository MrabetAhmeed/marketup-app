import { redirect } from "next/navigation";

export default function ValidationProfilesPage(): never {
  redirect("/admin/validation?tab=profils");
}
