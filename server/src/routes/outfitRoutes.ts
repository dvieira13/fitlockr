// src/routes/outfitRoutes.ts
import { Router } from "express";
import Outfit from "../models/outfit";
import Piece from "../models/piece";

const router = Router();

/**
 * @route POST /api/outfits
 * @desc  Create a new outfit
 * @body  { name, pieces: string[], tags?, created_by_* }
 */
router.post("/", async (req, res) => {
    try {
        const {
            name,
            pieces, // array of piece IDs
            tags,
            created_by_name,
            created_by_username,
            created_by_id,
            created_date,
        } = req.body;

        // optional: verify pieces exist
        if (pieces && pieces.length > 0) {
            const foundPieces = await Piece.find({ _id: { $in: pieces } });
            if (foundPieces.length !== pieces.length) {
                return res
                    .status(400)
                    .json({ error: "One or more pieces were not found" });
            }
        }

        const outfit = new Outfit({
            name,
            pieces,
            tags,
            created_by_name,
            created_by_username,
            created_by_id,
            created_date: created_date || new Date(),
        });

        await outfit.save();
        await outfit.populate("pieces");

        res.status(201).json({ outfit });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route GET /api/outfits
 * @desc  Get all outfits, optional filter by created_by_id
 * @query created_by_id=<userId>
 */
router.get("/", async (req, res) => {
    try {
        const { created_by_id } = req.query;

        const filter: any = {};
        if (created_by_id) {
            filter.created_by_id = created_by_id;
        }

        const outfits = await Outfit.find(filter).populate("pieces");
        res.json({ outfits });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/outfits/:id
 * @desc  Get a single outfit by id
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const outfit = await Outfit.findById(id).populate("pieces");
        if (!outfit) return res.status(404).json({ error: "Outfit not found" });

        res.json({ outfit });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/outfits/:id
 * @desc  Update an outfit by id
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // If updating pieces, you could optionally validate them like in POST

        const outfit = await Outfit.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).populate("pieces");

        if (!outfit) return res.status(404).json({ error: "Outfit not found" });

        res.json({ outfit });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/outfits/:id
 * @desc  Delete an outfit by id
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const outfit = await Outfit.findByIdAndDelete(id);
        if (!outfit) return res.status(404).json({ error: "Outfit not found" });

        res.json({ message: "Outfit deleted", outfit });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
