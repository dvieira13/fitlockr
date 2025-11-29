import express from "express";
import { Transaction } from "../models/transaction";

const router = express.Router();

/**
 * @route POST /api/transactions
 * @desc  Create a new transaction
 */
router.post("/", async (req, res) => {
    try {
        const { user_id, event_id, ticket_quantity } = req.body;

        const transaction = new Transaction({
            user_id: user_id,
            event_id: event_id,
            ticket_quantity: ticket_quantity,
        });

        await transaction.save();

        res.status(201).json({ transaction });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @route GET /api/transactions
 * @desc  Get all transactions, optionally filtered by userProfile (user_id)
 * @query user_id=<ObjectId>
 */
router.get("/", async (req, res) => {
    try {
        const { user_id } = req.query;

        const query: any = {};
        if (user_id) query.user_id = user_id;

        const transactions = await Transaction.find(query)
            .populate("user_id")
            .populate("event_id")
            .exec();

        res.status(200).json({ transactions });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


/**
 * @route DELETE /api/transactions
 * @desc  Delete a transaction by id
 * @query id=<ObjectId>
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findByIdAndDelete(id);
        if (!transaction) return res.status(404).json({ error: "Transaction not found" });
        res.json({ message: "Transaction deleted" });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
