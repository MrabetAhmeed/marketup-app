import { Schema } from "mongoose";
import { Profile } from "./profile.model";

const LinkUpSchema = new Schema(
  {
    data: {
      qrConfig: {
        style: { type: String, default: "rounded" },
        colorForeground: { type: String, default: "#000000" },
        colorBackground: { type: String, default: "#FFFFFF" },
        logoOverlay: { type: Boolean, default: true },
      },
      socials: [
        new Schema(
          {
            platform: { type: String, required: true },
            url: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
    },
  },
  { _id: false, versionKey: false },
);

export const LinkUp =
  Profile.discriminators?.linkup || Profile.discriminator("linkup", LinkUpSchema);
