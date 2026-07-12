import { redirect } from "next/navigation";

export default function ValidationRsePage(): never {
  redirect("/admin/validation?tab=rse");
}
