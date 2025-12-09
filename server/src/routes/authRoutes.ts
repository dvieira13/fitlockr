// src/routes/authRoutes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc  Log in with username + password for native accounts
 * @body  { username: string, password: string }
 */
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "username and password are required" });
        }

        // Find native user by username, including the password_hash field
        const user = await User.findOne({
            username,
            auth_type: "native",
            is_deleted: null,
        }).select("+password_hash"); // 👈 override select:false

        if (!user || !user.password_hash) {
            return res
                .status(401)
                .json({ error: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res
                .status(401)
                .json({ error: "Invalid username or password" });
        }

        // Convert to plain object and strip the hash before sending
        const userObj = user.toObject();
        delete (userObj as any).password_hash;

        // 🔒 NOTE: This returns the user only; no JWT/session yet.
        // For real auth you'd return a token here.
        return res.json({ user: userObj });
    } catch (err: any) {
        console.error("Error in /api/auth/login:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

export default router;
