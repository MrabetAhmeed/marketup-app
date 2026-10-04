// Shared by the server (notifications) and the client (order lists): no server import here.

export type ActivationPendingReason =
  | "profile_ineligible"
  | "amount_mismatch"
  | "service_already_active"
  | "company_suspended"
  | "account_deleted";

/** Why a paid order could not be activated, as shown to owners and admins. */
export const ACTIVATION_PENDING_REASON_LABELS: Record<ActivationPendingReason, string> = {
  profile_ineligible: "le profil n'est plus actif ou plus public",
  amount_mismatch: "le montant encaissé ne correspond pas à la commande",
  service_already_active: "le service est déjà actif ou n'est plus payable",
  company_suspended: "l'entreprise est suspendue",
  account_deleted: "le compte a été supprimé",
};

export function activationPendingReasonLabel(reason: string | null | undefined): string {
  return ACTIVATION_PENDING_REASON_LABELS[reason as ActivationPendingReason] ?? "cause à vérifier";
}

export interface OrderOutcomeBanner {
  tone: "success" | "waiting" | "failure";
  icon: string;
  text: string;
  /** Present when the buyer can do something about it. */
  action?: { label: string; href: string };
}

/** The return route of an order: going through it again triggers a new verification (throttled). */
export function orderVerificationPath(orderId: string): string {
  return `/api/v1/payments/return?order=${orderId}`;
}

/** What the buyer reads when coming back from the payment page — taken from the order itself. */
export function orderOutcomeBanner(order: {
  id?: string;
  type: string;
  status: string;
  activationPending?: boolean;
  activationPendingReason?: string | null;
}): OrderOutcomeBanner {
  const paid = order.status === "paid" || order.status === "paid_simulated";
  if (paid && order.activationPending) {
    return {
      tone: "waiting",
      icon: "hourglass_top",
      text: `Paiement reçu. L'activation est en attente : ${activationPendingReasonLabel(order.activationPendingReason)}. Notre équipe vous contactera.`,
    };
  }
  if (paid) {
    const service = order.type === "boost" ? "Votre boost est activé." : "Votre campagne est lancée.";
    return { tone: "success", icon: "check_circle", text: `Paiement confirmé. ${service}` };
  }
  if (order.status === "failed") {
    return { tone: "failure", icon: "error", text: "Le paiement n'a pas abouti. Aucun service n'a été activé. Vous pouvez réessayer." };
  }
  if (order.status === "expired") {
    return { tone: "failure", icon: "error", text: "La session de paiement a expiré. Aucun service n'a été activé. Vous pouvez réessayer." };
  }
  // Reloading this page verifies nothing: only the return route does.
  return {
    tone: "waiting",
    icon: "hourglass_top",
    text: "Paiement en cours de vérification.",
    action: order.id ? { label: "Vérifier maintenant", href: orderVerificationPath(order.id) } : undefined,
  };
}

export type OrderDisplayStatus = "pending" | "paid" | "paid_simulated" | "refunded" | "failed" | "expired";

/** Status pill of an order: existing pill kinds and colours, no new design. */
export function orderStatusPill(order: { status: string; activationPending?: boolean }): {
  kind: "paid" | "pending" | "failed" | "refunded" | "disabled";
  label: string;
} {
  const paid = order.status === "paid" || order.status === "paid_simulated";
  if (paid && order.activationPending) return { kind: "pending", label: "Payé — activation en attente" };
  if (order.status === "paid_simulated") return { kind: "paid", label: "Payé (test)" };
  if (order.status === "paid") return { kind: "paid", label: "Payé" };
  if (order.status === "refunded") return { kind: "refunded", label: "Remboursé" };
  if (order.status === "failed") return { kind: "failed", label: "Échoué" };
  if (order.status === "expired") return { kind: "disabled", label: "Expiré" };
  return { kind: "pending", label: "En attente de paiement" };
}
