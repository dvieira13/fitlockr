import { Router } from "express";
import { logToFile } from "../utils/logger";

const router = Router();

router.post("/", (req, res) => {
    try {
        logToFile(req.body);
        res.status(200).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
