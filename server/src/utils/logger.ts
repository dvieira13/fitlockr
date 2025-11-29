import fs from "fs";
import path from "path";

/**
 * Logs messages to a JSON file in the /logs directory.
 * Automatically rotates daily (creates new file per date).
 */
export function logToFile(entry: any) {
    const date = new Date();
    const dateString = date.toISOString().split("T")[0]; // e.g., "2025-10-24"

    // Ensure /logs directory exists
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, `dylTicketsLog-${dateString}.json`);
    const timestamp = date.toISOString();
    const logEntry = { timestamp, ...entry };

    try {
        let logs: any[] = [];
        if (fs.existsSync(logFile)) {
            const existing = fs.readFileSync(logFile, "utf-8");
            logs = JSON.parse(existing || "[]");
        }

        logs.push(logEntry);

        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf-8");
    } catch (err) {
        console.error("Failed to write to log file:", err);
    }
}
