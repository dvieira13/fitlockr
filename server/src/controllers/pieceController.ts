// src/controllers/pieceController.ts
import { Request, Response } from "express";
import cloudinary from "../utils/cloudinary";
import Piece from "../models/piece";

const isCloudinaryUrl = (url: string) =>
    url.startsWith("https://res.cloudinary.com/");

// normalize a single image URL / base64 string into Cloudinary
const uploadToCloudinaryIfNeeded = async (
    img: string | null | undefined,
    folder = "fitlockr/pieces"
): Promise<string | null> => {
    if (!img) return null;

    if (isCloudinaryUrl(img)) {
        // already in Cloudinary, just keep as-is
        return img;
    }

    const result = await cloudinary.uploader.upload(img, {
        folder,
        resource_type: "image",
    });

    return result.secure_url;
};

// still in src/controllers/pieceController.ts

export const uploadPieceImageFromUrl = async (
    req: Request,
    res: Response
) => {
    try {
        const { url, folder = "fitlockr/pieces" } = req.body as {
            url?: string;
            folder?: string;
        };

        if (!url) {
            return res.status(400).json({ message: "url is required" });
        }

        const secureUrl = await uploadToCloudinaryIfNeeded(url, folder);

        if (!secureUrl) {
            return res
                .status(500)
                .json({ message: "Failed to upload image to Cloudinary" });
        }

        return res.status(200).json({
            url: secureUrl,
        });
    } catch (err) {
        console.error("uploadPieceImageFromUrl error:", err);
        return res
            .status(500)
            .json({ message: "Error uploading image from URL" });
    }
};

// src/controllers/pieceController.ts (continuing)

export const createPiece = async (req: Request, res: Response) => {
    try {
        const {
            primary_img,
            secondary_imgs = [],
            name,
            notes,
            owned,
            type,
            subtype,
            colors,
            brand,
            size,
            price,
            product_link,
            tags,
            created_by_name,
            created_by_username,
            created_by_id,
        } = req.body;

        if (!primary_img) {
            return res.status(400).json({ message: "primary_img is required" });
        }

        if (!name || !type || !colors || !colors.length) {
            return res.status(400).json({
                message: "name, type, and at least one color are required",
            });
        }

        // 1) Always ensure images are in Cloudinary /pieces
        const normalizedPrimary = await uploadToCloudinaryIfNeeded(
            primary_img,
            "fitlocker/pieces"
        );

        if (!normalizedPrimary) {
            return res
                .status(500)
                .json({ message: "Failed to upload primary image" });
        }

        const normalizedSecondary: string[] = [];
        for (const img of secondary_imgs) {
            const normalized = await uploadToCloudinaryIfNeeded(img, "fitlockr/pieces");
            if (normalized) {
                normalizedSecondary.push(normalized);
            }
        }

        // 2) Create Piece with Cloudinary URLs
        const piece = await Piece.create({
            primary_img: normalizedPrimary,
            secondary_imgs: normalizedSecondary.slice(0, 6),
            name,
            notes: notes ?? null,
            owned: typeof owned === "boolean" ? owned : true,
            type,
            subtype: subtype ?? null,
            colors,
            brand: brand ?? null,
            size: size ?? null,
            price: price ?? null,
            product_link: product_link ?? null,
            tags: tags ?? null,
            created_by_name,
            created_by_username,
            created_by_id,
        });

        return res.status(201).json({ piece });
    } catch (err) {
        console.error("createPiece error:", err);
        return res
            .status(500)
            .json({ message: "Error creating piece" });
    }
};
