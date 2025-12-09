// src/routes/userRoutes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import Piece from "../models/piece";
import Outfit from "../models/outfit";
import Shelf from "../models/shelf";
// ⬇️ use the shared Cloudinary helper instead of importing cloudinary directly
import { uploadBase64ImageToCloudinary } from "../utils/cloudinary";

const router = Router();
const SALT_ROUNDS = 10;

/**
 * @route GET /api/users/email/:email
 * @desc  Get a single user by email (non-deleted)
 */
router.get("/email/:email", async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email, is_deleted: null })
            .populate("pieces")
            .populate("outfits")
            .populate("shelves");

        res.json({ user: user || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/users/username/:username
 * @desc  Get a single user by username (non-deleted)
 */
router.get("/username/:username", async (req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username, is_deleted: null })
            .populate("pieces")
            .populate("outfits")
            .populate("shelves");

        res.json({ user: user || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/users
 * @desc  Create a new user. If user with same email exists, return existing one.
 *
 * Body:
 *  - first_name (string, required)
 *  - last_name  (string, required)
 *  - name       (string, required)
 *  - email      (string, required, unique)
 *  - username   (string, optional — if missing, default is derived from email)
 *  - picture    (string, optional)
 *  - auth_type  ("native" | "google", optional; default "native")
 *  - password   (string, required for native accounts)
 */
router.post("/", async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            name,
            picture,
            email,
            username,
            auth_type, // "native" | "google"
            password,
        } = req.body;

        if (!first_name || !last_name || !name || !email) {
            return res.status(400).json({
                error: "first_name, last_name, name, and email are required",
            });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(200).json({ user: existing });
        }

        const finalAuthType = auth_type || "native";

        // For native accounts, require a password
        let password_hash: string | undefined = undefined;
        if (finalAuthType === "native") {
            if (
                !password ||
                typeof password !== "string" ||
                password.trim().length < 6
            ) {
                return res.status(400).json({
                    error: "Password is required for native accounts and must be at least 6 characters.",
                });
            }
            password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        }

        // If username not provided (e.g. Google sign-in), derive a default
        const derivedUsername =
            username ||
            (typeof email === "string" ? email.split("@")[0] : email) ||
            email;

        const user = new User({
            first_name,
            last_name,
            name,
            username: derivedUsername,
            picture,
            email,
            auth_type: finalAuthType,
            password_hash, // may be undefined for google accounts
        });

        await user.save();

        // Because password_hash has select:false, it will not appear by default
        res.status(201).json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route POST /api/users/update-password
 * @desc  Update password for a native user
 *
 * Body:
 *  - user_id      (string, required)
 *  - new_password (string, required, min 6 chars)
 */
router.post("/update-password", async (req, res) => {
    try {
        const { user_id, new_password } = req.body;

        if (!user_id || !new_password || typeof new_password !== "string") {
            return res
                .status(400)
                .json({ error: "user_id and new_password are required." });
        }

        if (new_password.trim().length < 6) {
            return res
                .status(400)
                .json({ error: "Password must be at least 6 characters." });
        }

        const user = await User.findById(user_id);
        if (!user || user.is_deleted) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.auth_type !== "native") {
            return res
                .status(400)
                .json({ error: "Password can only be updated for native accounts." });
        }

        const hashed = await bcrypt.hash(new_password, SALT_ROUNDS);
        user.password_hash = hashed;
        await user.save();

        return res.json({ message: "Password updated successfully." });
    } catch (err: any) {
        console.error("Error updating password", err);
        return res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * @route POST /api/users/:id/profile-picture
 * @desc  Upload a profile picture to Cloudinary and store the URL on the user
 * @body  { image: string }  // base64 data URL
 */
router.post("/:id/profile-picture", async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Image is required." });
        }

        // 👇 Upload to Cloudinary using the shared helper
        //    Folder "users" keeps all user avatars together.
        //    If you prefer namespacing, you can change this to "fitlockr/users".
        const { url } = await uploadBase64ImageToCloudinary(image, "fitlockr/users");

        const user = await User.findByIdAndUpdate(
            id,
            { picture: url },
            {
                new: true,
                runValidators: true,
            }
        )
            .populate("pieces")
            .populate("outfits")
            .populate("shelves");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (err: any) {
        console.error("Error uploading profile picture:", err);
        res.status(500).json({
            error:
                err.message ||
                "An error occurred while uploading the profile picture.",
        });
    }
});

/**
 * @route GET /api/users
 * @desc  Get all non-deleted users
 */
router.get("/", async (_req, res) => {
    try {
        const users = await User.find({ is_deleted: null });
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/users/all
 * @desc  Get all users, including deleted
 */
router.get("/all", async (_req, res) => {
    try {
        const users = await User.find();
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/users/:id
 * @desc  Get a single user by id
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate("pieces")
            .populate("outfits")
            .populate("shelves");

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/users/:id
 * @desc  Update a user by id (supports username now)
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/users/:id
 * @desc  Soft delete a user (set is_deleted = Date)
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            { is_deleted: new Date() },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: "User marked as deleted", user });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PATCH /api/users/:id/soft-delete
 * @desc  Explicit soft delete (same as DELETE, but via PATCH)
 */
router.patch("/:id/soft-delete", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            { is_deleted: new Date() },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "User successfully soft-deleted.",
            user,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

//
// ──────────────────────────────────────────────────────────────
//   USER–PIECE RELATION ROUTES
// ──────────────────────────────────────────────────────────────
//

/**
 * @route GET /api/users/:id/pieces
 * @desc  Get all pieces for a user
 */
router.get("/:id/pieces", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).populate("pieces");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ pieces: user.pieces || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/users/:id/pieces
 * @desc  Link an existing piece to a user (also add to all_items)
 * @body  { piece_id: string }
 */
router.post("/:id/pieces", async (req, res) => {
    try {
        const { id } = req.params;
        const { piece_id } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const piece = await Piece.findById(piece_id);
        if (!piece) return res.status(404).json({ error: "Piece not found" });

        // Avoid duplicates
        const pieceIdStr = piece._id.toString();
        const existingPiece = user.pieces?.some(
            (p: any) => p.toString() === pieceIdStr
        );
        if (!existingPiece) {
            user.pieces?.push(piece._id);
        }

        const existingAllItem = user.all_items?.some(
            (item: any) =>
                item.item_id.toString() === pieceIdStr &&
                item.item_type === "Piece"
        );
        if (!existingAllItem) {
            user.all_items?.push({
                item_id: piece._id,
                item_type: "Piece",
            } as any);
        }

        await user.save();
        await user.populate("pieces");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/users/:id/pieces/:pieceId
 * @desc  Unlink a piece from a user (also remove from all_items)
 */
router.delete("/:id/pieces/:pieceId", async (req, res) => {
    try {
        const { id, pieceId } = req.params;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.pieces = (user.pieces || []).filter(
            (p: any) => p.toString() !== pieceId
        );

        user.all_items = (user.all_items || []).filter(
            (item: any) =>
                !(
                    item.item_id.toString() === pieceId &&
                    item.item_type === "Piece"
                )
        );

        await user.save();
        await user.populate("pieces");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

//
// ──────────────────────────────────────────────────────────────
//   USER–OUTFIT RELATION ROUTES
// ──────────────────────────────────────────────────────────────
//

/**
 * @route GET /api/users/:id/outfits
 * @desc  Get all outfits for a user
 */
router.get("/:id/outfits", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).populate("outfits");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ outfits: user.outfits || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/users/:id/outfits
 * @desc  Link an existing outfit to a user (also add to all_items)
 * @body  { outfit_id: string }
 */
router.post("/:id/outfits", async (req, res) => {
    try {
        const { id } = req.params;
        const { outfit_id } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const outfit = await Outfit.findById(outfit_id);
        if (!outfit) return res.status(404).json({ error: "Outfit not found" });

        const outfitIdStr = outfit._id.toString();

        const existingOutfit = user.outfits?.some(
            (o: any) => o.toString() === outfitIdStr
        );
        if (!existingOutfit) {
            user.outfits?.push(outfit._id);
        }

        const existingAllItem = user.all_items?.some(
            (item: any) =>
                item.item_id.toString() === outfitIdStr &&
                item.item_type === "Outfit"
        );
        if (!existingAllItem) {
            user.all_items?.push({
                item_id: outfit._id,
                item_type: "Outfit",
            } as any);
        }

        await user.save();
        await user.populate("outfits");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/users/:id/outfits/:outfitId
 * @desc  Unlink an outfit from a user (also remove from all_items)
 */
router.delete("/:id/outfits/:outfitId", async (req, res) => {
    try {
        const { id, outfitId } = req.params;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.outfits = (user.outfits || []).filter(
            (o: any) => o.toString() !== outfitId
        );

        user.all_items = (user.all_items || []).filter(
            (item: any) =>
                !(
                    item.item_id.toString() === outfitId &&
                    item.item_type === "Outfit"
                )
        );

        await user.save();
        await user.populate("outfits");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

//
// ──────────────────────────────────────────────────────────────
//   USER–SHELF RELATION ROUTES
// ──────────────────────────────────────────────────────────────
//

/**
 * @route GET /api/users/:id/shelves
 * @desc  Get all shelves for a user
 */
router.get("/:id/shelves", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).populate("shelves");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ shelves: user.shelves || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/users/:id/shelves
 * @desc  Link an existing shelf to a user
 * @body  { shelf_id: string }
 */
router.post("/:id/shelves", async (req, res) => {
    try {
        const { id } = req.params;
        const { shelf_id } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const shelf = await Shelf.findById(shelf_id);
        if (!shelf) return res.status(404).json({ error: "Shelf not found" });

        const shelfIdStr = shelf._id.toString();

        const existingShelf = user.shelves?.some(
            (s: any) => s.toString() === shelfIdStr
        );
        if (!existingShelf) {
            user.shelves?.push(shelf._id);
        }

        await user.save();
        await user.populate("shelves");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/users/:id/shelves/:shelfId
 * @desc  Unlink a shelf from a user
 */
router.delete("/:id/shelves/:shelfId", async (req, res) => {
    try {
        const { id, shelfId } = req.params;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.shelves = (user.shelves || []).filter(
            (s: any) => s.toString() !== shelfId
        );

        await user.save();
        await user.populate("shelves");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
