export interface RseReceiptForUser {
  id: string;
  associationName: string;
  associationLogoUrl: string | null;
  amount: number;
  donationDate: string;
  submissionDate: string;
  status: "validated" | "pending" | "rejected";
  rejectionReason: string | null;
  attestationUrl: string | null;
}

export interface RsePageData {
  badgeStatus: "validated" | "none";
  badgeValidatedAt: string | null;
  receipts: RseReceiptForUser[];
  stats: {
    totalValidatedAmount: number;
    totalPendingAmount: number;
    validatedCount: number;
    pendingCount: number;
    totalCount: number;
    lastValidatedDate: string | null;
    lastValidatedAssociation: string | null;
  };
  associations: { id: string; name: string; logoUrl: string | null }[];
}
