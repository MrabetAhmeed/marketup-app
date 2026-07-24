import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getMe } from "@/services/me.service";
import { deleteMyAccount } from "@/services/account-delete.service";
import { deleteAccountLimit } from "@/lib/rate-limit";
import type { SupportedLang } from "@/lib/i18n";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";
    // requireOwner() guarantees companyId is non-null for OWNER role
    const me = await getMe(session.user.id, session.user.companyId!, lang);
    if (!me) {
      return jsonError(
        "SESSION_INVALID",
        "Votre session a expiré. Veuillez vous reconnecter.",
        401,
      );
    }
    return jsonOk(me);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();

    // Rate limit per userId
    const rl = deleteAccountLimit.check(`delete-account:${session.user.id}`);
    if (!rl.allowed) {
      return jsonError("RATE_LIMITED", "Trop de tentatives. Réessayez plus tard.", 429);
    }

    const body = await req.json();
    const password = body?.password;
    if (!password || typeof password !== "string") {
      return jsonError("VALIDATION_FAILED", "Mot de passe requis.", 400);
    }

    await deleteMyAccount(session.user.id, password);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
