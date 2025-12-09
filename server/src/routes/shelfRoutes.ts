// src/routes/shelfRoutes.ts
import { Router } from "express";
import Shelf from "../models/shelf";
import Piece from "../models/piece";
import Outfit from "../models/outfit";

const router = Router();

/**
 * @route POST /api/shelves
 * @desc  Create a new shelf
 * @body  { name, items?, created_by_* }
 *        items: [{ item_id: string, item_type: "Piece" | "Outfit" }]
 */
router.post("/", async (req, res) => {
    try {
        const {
            name,
            items,
            created_by_name,
            created_by_username,
            created_by_id,
            created_date,
        } = req.body;

        // Optionally validate items
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.item_type === "Piece") {
                    const exists = await Piece.exists({ _id: item.item_id });
                    if (!exists) {
                        return res
                            .status(400)
                            .json({ error: `Piece not found: ${item.item_id}` });
                    }
                } else if (item.item_type === "Outfit") {
                    const exists = await Outfit.exists({ _id: item.item_id });
                    if (!exists) {
                        return res
                            .status(400)
                            .json({ error: `Outfit not found: ${item.item_id}` });
                    }
                } else {
                    return res
                        .status(400)
                        .json({ error: `Invalid item_type: ${item.item_type}` });
                }
            }
        }

        // 🔹 Normalize items to ensure item_added_date is set
        const normalizedItems =
            items?.map((item: any) => ({
                item_id: item.item_id,
                item_type: item.item_type,
                item_added_date: item.item_added_date
                    ? new Date(item.item_added_date)
                    : new Date(),
            })) ?? [];

        const shelf = new Shelf({
            name,
            items: normalizedItems,
            created_by_name,
            created_by_username,
            created_by_id,
            created_date: created_date || new Date(),
        });

        await shelf.save();
        await shelf.populate("items.item_id");

        res.status(201).json({ shelf });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @route GET /api/shelves
 * @desc  Get all shelves, optional filter by created_by_id
 * @query created_by_id=<userId>
 */
router.get("/", async (req, res) => {
    try {
        const { created_by_id } = req.query;

        const filter: any = {};
        if (created_by_id) {
            filter.created_by_id = created_by_id;
        }

        const shelves = await Shelf.find(filter).populate("items.item_id");
        res.json({ shelves });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/shelves/:id
 * @desc  Get a single shelf by id
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const shelf = await Shelf.findById(id).populate("items.item_id");
        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        res.json({ shelf });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/shelves/:id
 * @desc  Update a shelf by id
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        if (Array.isArray(updates.items)) {
            updates.items = updates.items.map((item: any) => ({
                item_id: item.item_id,
                item_type: item.item_type,
                item_added_date: item.item_added_date
                    ? new Date(item.item_added_date)
                    : new Date(),
            }));
        }

        const shelf = await Shelf.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).populate("items.item_id");

        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        res.json({ shelf });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @route DELETE /api/shelves/:id
 * @desc  Delete a shelf by id
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const shelf = await Shelf.findByIdAndDelete(id);
        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        res.json({ message: "Shelf deleted", shelf });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

//
// ──────────────────────────────────────────────────────
//   SHELF ITEM HELPERS (add / remove single item)
// ──────────────────────────────────────────────────────
//

/**
 * @route POST /api/shelves/:id/items
 * @desc  Add an item to a shelf
 * @body  { item_id: string, item_type: "Piece" | "Outfit" }
 */
/**
 * @route POST /api/shelves/:id/items
 * @desc  Add an item to a shelf
 * @body  { item_id: string, item_type: "Piece" | "Outfit", item_added_date?: string }
 */
router.post("/:id/items", async (req, res) => {
    try {
        const { id } = req.params;
        const { item_id, item_type, item_added_date } = req.body;

        const shelf = await Shelf.findById(id);
        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        if (item_type === "Piece") {
            const exists = await Piece.exists({ _id: item_id });
            if (!exists) {
                return res.status(400).json({ error: "Piece not found" });
            }
        } else if (item_type === "Outfit") {
            const exists = await Outfit.exists({ _id: item_id });
            if (!exists) {
                return res.status(400).json({ error: "Outfit not found" });
            }
        } else {
            return res.status(400).json({ error: "Invalid item_type" });
        }

        const already = (shelf.items || []).some(
            (item: any) =>
                item.item_id.toString() === item_id &&
                item.item_type === item_type
        );
        if (!already) {
            shelf.items.push({
                item_id,
                item_type,
                item_added_date: item_added_date
                    ? new Date(item_added_date)
                    : new Date(),
            } as any);
        }

        await shelf.save();
        await shelf.populate("items.item_id");

        res.json({ shelf });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @route DELETE /api/shelves/:id/items/:itemId
 * @desc  Remove an item from a shelf
 * @query item_type=Piece|Outfit
 */
router.delete("/:id/items/:itemId", async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { item_type } = req.query as { item_type?: string };

        if (!item_type || !["Piece", "Outfit"].includes(item_type)) {
            return res
                .status(400)
                .json({ error: "item_type query param must be Piece or Outfit" });
        }

        const shelf = await Shelf.findById(id);
        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        shelf.items = (shelf.items || []).filter(
            (item: any) =>
                !(
                    item.item_id.toString() === itemId &&
                    item.item_type === item_type
                )
        );

        await shelf.save();
        await shelf.populate("items.item_id");

        res.json({ shelf });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
