import { Router } from "express";
import UserProfile from "../models/userProfile";

const router = Router();

/**
 * @route GET /api/users
 * @desc  Get user, filtered by email 
 * @query email=<email>
 */
router.get("/email/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await UserProfile.findOne({ email, is_deleted: null })
            .populate("carted_events.event_id")
            .populate("purchased_events.event_id");

        res.json({ user: user || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/users
 * @desc  Create a new userProfile. If user with same email already exists, return existing one instead.
 */
router.post("/", async (req, res) => {
    try {
        const { first_name, last_name, name, picture, email } = req.body;

        const existing = await UserProfile.findOne({ email });
        if (existing) {
            return res.status(200).json({ user: existing });
        }

        const user = new UserProfile({ first_name, last_name, name, picture, email });
        await user.save();
        res.status(201).json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route GET /api/users
 * @desc  Get all users, filtered by non-deleted
 */
router.get("/", async (_req, res) => {
    try {
        const users = await UserProfile.find({ is_deleted: null });
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/users
 * @desc  Get all users, including deleted
 */
router.get("/all", async (_req, res) => {
    try {
        const users = await UserProfile.find();
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/users
 * @desc  Update user, with id 
 * @query id=<ObjectId>
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await UserProfile.findByIdAndUpdate(id, updates, {
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
 * @route DELETE /api/users
 * @desc  Delete user, with id 
 * @query id=<ObjectId>
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await UserProfile.findByIdAndUpdate(
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
 * @route POST /api/users
 * @desc  Add or update an event in the user's cart 
 * @query id=<ObjectId>
 * @body { event_id, ticket_quantity }
 */
router.post("/:id/cart", async (req, res) => {
    try {
        const { id } = req.params; // user id
        const { event_id, ticket_quantity } = req.body;

        const user = await UserProfile.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Check if event already in cart
        const existingEvent = user.carted_events?.find(
            (e: any) => e.event_id.toString() === event_id
        );

        if (existingEvent) {
            // Update ticket quantity
            existingEvent.ticket_quantity = ticket_quantity;
        } else {
            // Add new carted event
            user.carted_events?.push({ event_id, ticket_quantity });
        }

        await user.save();

        await user.populate("carted_events.event_id");

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/users
 * @desc  Delete an event from user's cart
 * @query id=<ObjectId>,eventId=<event_id>
 */
router.delete("/:id/cart/:eventId", async (req, res) => {
    try {
        const { id, eventId } = req.params;

        const user = await UserProfile.findByIdAndUpdate(
            id,
            { $pull: { carted_events: { event_id: eventId } } },
            { new: true }
        ).populate("carted_events.event_id");

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route POST /api/users
 * @desc  Move event from cart to purchased in user object 
 * @query id=<ObjectId>
 * @body { event_id, ticket_quantity }
 */
router.post("/:id/purchase", async (req, res) => {
    try {
        const { id } = req.params;
        const { event_id, ticket_quantity } = req.body;

        const user = await UserProfile.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Remove from cart if exists
        user.carted_events = user.carted_events?.filter(
            (e: any) => e.event_id.toString() !== event_id
        );

        // Add to purchased list
        user.purchased_events?.push({ event_id, ticket_quantity });

        await user.save();
        await user.populate(["carted_events.event_id", "purchased_events.event_id"]);

        res.json({ user });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route PATCH /api/users
 * @desc  SOFT DELETE: Mark a user profile as deleted (is_deleted = new Date())
 * @query id=<ObjectId>
 */
router.patch("/:id/soft-delete", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await UserProfile.findByIdAndUpdate(
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


export default router;
