import express from "express";
import { Event } from "../models/event";

const router = express.Router();

/**
 * @route POST /api/events
 * @desc  Create a new event
 */
router.post("/", async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({ event });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route GET /api/events
 * @desc  Get all events
 */
router.get("/", async (_req, res) => {
    const events = await Event.find();
    res.json({ events });
});

export default router;
