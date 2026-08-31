import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/api-error";
import { User } from "@/models/user.model";
import { Association } from "@/models/association.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { uploadReceiptFromFile, MAX_RSE_RECEIPTS_PER_COMPANY } from "@/lib/upload";
import { CreateRseDonationSchema } from "@/schemas/rse-donation.schema";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
const UserModel = User as any;
const AssociationModel = Association as any;
const RseReceiptModel = RseReceipt as any;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    await connectDb();

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) throw new NotFoundError("User");
    const companyId = user.companyId?.toString();
    if (!companyId) throw new NotFoundError("Company");

    // Parse multipart
    const formData = await req.formData();
    const file = formData.get("receipt");
    if (!file || !(file instanceof File)) {
      throw new AppError("VALIDATION_FAILED", "Le reçu de don est obligatoire.", 400, {
        fields: { receipt: ["Aucun fichier fourni."] },
      });
    }

    // Validate text fields
    const rawFields = {
      associationId: formData.get("associationId") as string ?? "",
      amount: formData.get("amount") as string ?? "",
      donationDate: formData.get("donationDate") as string ?? "",
      receiptNumber: formData.get("receiptNumber") as string ?? "",
      notes: formData.get("notes") as string ?? "",
    };
    const parsed = CreateRseDonationSchema.parse({
      ...rawFields,
      amount: Number(rawFields.amount),
    });

    // Check receipt cap per company
    const receiptCount = await RseReceiptModel.countDocuments({ companyId });
    if (receiptCount >= MAX_RSE_RECEIPTS_PER_COMPANY) {
      throw new AppError(
        "RSE_RECEIPT_LIMIT",
        `Vous avez atteint la limite de ${MAX_RSE_RECEIPTS_PER_COMPANY} reçus par entreprise. Supprimez un reçu existant pour en ajouter un nouveau.`,
        422,
      );
    }

    // Verify association exists and is active
    const association = await AssociationModel.findById(parsed.associationId).lean();
    if (!association || !association.active) {
      throw new NotFoundError("Association");
    }

    // Upload receipt to Cloudinary
    const uploadResult = await uploadReceiptFromFile(file, companyId);

    // Create RseReceipt
    const receiptNumber = parsed.receiptNumber?.trim() || null;

    // Check duplicate receiptNumber for same company
    if (receiptNumber) {
      const existing = await RseReceiptModel.findOne({ companyId, receiptNumber }).lean();
      if (existing) {
        throw new AppError("DUPLICATE_RECEIPT_NUMBER", "Un reçu avec ce numéro existe déjà pour votre entreprise.", 409);
      }
    }

    const receipt = await RseReceiptModel.create({
      companyId,
      associationId: parsed.associationId,
      amount: parsed.amount,
      donationDate: new Date(parsed.donationDate),
      receiptDocumentUrl: uploadResult.url,
      receiptNumber,
      status: "pending",
      submittedAt: new Date(),
    });

    return jsonOk({
      id: receipt._id.toString(),
      status: "pending",
      amount: parsed.amount,
      associationId: parsed.associationId,
      donationDate: parsed.donationDate,
      receiptNumber,
      receiptDocumentUrl: uploadResult.url,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
