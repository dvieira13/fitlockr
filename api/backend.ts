// api/backend.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../server/src/app";

export default (req: VercelRequest, res: VercelResponse) => {
    // Express app is just a (req, res) handler
    return app(req as any, res as any);
};
