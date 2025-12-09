// src/routes/pieceRoutes.ts
import { Router } from "express";
import Piece, { COMFORT_TAG_KEYS, SEASON_TAG_KEYS } from "../models/piece";
import { uploadBase64ImageToCloudinary } from "../utils/cloudinary";
import * as cheerio from "cheerio"; // 👈 for HTML parsing (npm i cheerio)
import {
    createPiece,
    uploadPieceImageFromUrl,
    // ... other imports like updatePiece, etc
} from "../controllers/pieceController";

const router = Router();

/**
 * @route GET /api/pieces/tags
 * @desc  Get metadata for piece tags (comfort + season)
 */
router.get("/tags", (_req, res) => {
    const comfort = COMFORT_TAG_KEYS.map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
    }));

    const season = SEASON_TAG_KEYS.map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
    }));

    res.json({
        tags: {
            comfort,
            season,
        },
    });
});

/**
 * @route POST /api/pieces
 * @desc  Create a new piece (images normalized via Cloudinary in controller)
 */
router.post("/", createPiece);


/**
 * @route POST /api/pieces/upload-image
 * @desc  Upload a piece image (base64 data URL) to Cloudinary (folder: "fitlockr/pieces")
 * @body  { image: string }
 */
router.post("/upload-image", async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Image is required" });
        }

        const { url, public_id } = await uploadBase64ImageToCloudinary(
            image,
            "fitlockr/pieces"
        );

        res.json({ url, public_id });
    } catch (err: any) {
        console.error("Error uploading piece image", err);
        res.status(500).json({ error: err.message || "Upload failed" });
    }
});

/**
 * @route POST /api/pieces/upload-image-from-url
 * @desc  Upload a remote image URL to Cloudinary (folder: "pieces")
 * @body  { url: string, folder?: string }
 */
router.post("/upload-image-from-url", uploadPieceImageFromUrl);


/**
 * @route POST /api/pieces/scrape-from-url
 * @desc  Scrape a shopping product URL for images/name/brand/type/colors
 * @body  { url: string }
 */
router.post("/scrape-from-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "url is required" });
    }

    try {
        // If you're NOT on Node 18+, install node-fetch and:
        // import fetch from "node-fetch";
        const pageRes = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
            },
        });

        if (!pageRes.ok) {
            return res
                .status(500)
                .json({ error: "Failed to fetch product page" });
        }

        const html = await pageRes.text();
        const $ = cheerio.load(html);

        // --- VERY BASIC heuristics (you can customize per retailer) ---

        // Primary image: try Open Graph / Twitter, then fall back to first <img>
        const ogImage =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            $("img").first().attr("src") ||
            null;

        const primaryImage = ogImage ? new URL(ogImage, url).toString() : null;

        // Secondary images: first few unique <img> srcs
        const secondaryImages: string[] = [];
        $("img")
            .slice(0, 6)
            .each((_, el) => {
                const src = $(el).attr("src");
                if (src) {
                    const absolute = new URL(src, url).toString();
                    if (!secondaryImages.includes(absolute)) {
                        secondaryImages.push(absolute);
                    }
                }
            });

        // Title / name
        const title =
            $('meta[property="og:title"]').attr("content") ||
            $("title").text() ||
            "";

        // Brand – very site-specific; these are generic guesses
        const brand =
            $('meta[property="og:site_name"]').attr("content") ||
            $('meta[itemprop="brand"]').attr("content") ||
            $('meta[name="brand"]').attr("content") ||
            "";

        // Type – also site-dependent, you may want to post-process this on the frontend
        const type =
            $('meta[property="product:category"]').attr("content") ||
            $('meta[name="category"]').attr("content") ||
            "";

        // Colors – placeholder: leave empty or implement retailer-specific scraping
        const colors: string[] = [];

        return res.json({
            primaryImage,
            secondaryImages,
            name: title,
            brand,
            type,
            colors,
        });
    } catch (err) {
        console.error("Error scraping product URL", err);
        return res
            .status(500)
            .json({ error: "Failed to scrape product details" });
    }
});

/**
 * @route GET /api/pieces
 * @desc  Get all pieces, optional filter by created_by_id
 * @query created_by_id=<userId>
 */
router.get("/", async (req, res) => {
    try {
        const { created_by_id } = req.query;

        const filter: any = {};
        if (created_by_id) {
            filter.created_by_id = created_by_id;
        }

        const pieces = await Piece.find(filter);
        res.json({ pieces });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/pieces/:id
 * @desc  Get a single piece by id
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const piece = await Piece.findById(id);
        if (!piece) return res.status(404).json({ error: "Piece not found" });

        res.json({ piece });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/pieces/:id
 * @desc  Update a piece by id
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        if (Array.isArray(updates.secondary_imgs)) {
            updates.secondary_imgs = updates.secondary_imgs.slice(0, 6);
        }

        const piece = await Piece.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!piece) return res.status(404).json({ error: "Piece not found" });

        res.json({ piece });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @route DELETE /api/pieces/:id
 * @desc  Delete a piece by id
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const piece = await Piece.findByIdAndDelete(id);
        if (!piece) return res.status(404).json({ error: "Piece not found" });

        res.json({ message: "Piece deleted", piece });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
