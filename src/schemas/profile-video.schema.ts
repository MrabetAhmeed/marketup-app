import { z } from "zod";
import { isValidVideoUrl, type VideoPlatform } from "@/lib/video/parsers";

// ---------------------------------------------------------------------------
// Video CRUD schemas — TraceUP only
// ---------------------------------------------------------------------------

const PLATFORMS = ["youtube", "vimeo", "dailymotion"] as const;
const CATEGORIES = ["actualite", "offres", "astuces", "emplois"] as const;

export const CreateVideoSchema = z.object({
  platform: z.enum(PLATFORMS, { errorMap: () => ({ message: "Plateforme non reconnue." }) }),
  url: z.string().min(1, "L'URL est obligatoire."),
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(120, "120 caractères maximum."),
  description: z.string().trim().max(280, "280 caractères maximum.").default(""),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Catégorie non reconnue." }) }),
}).strict().refine(
  (data) => isValidVideoUrl(data.platform as VideoPlatform, data.url),
  { message: "URL non reconnue pour cette plateforme.", path: ["url"] },
);

export type CreateVideoInput = z.infer<typeof CreateVideoSchema>;
