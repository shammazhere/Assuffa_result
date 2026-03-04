import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";

dotenv.config();

// Enforce critical environment variables
const requiredEnvs = ['DATABASE_URL', 'JWT_SECRET'];
for (const env of requiredEnvs) {
    if (!process.env[env]) {
        console.error(`FATAL ERROR: Environment variable ${env} is missing.`);
        process.exit(1);
    }
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(helmet());
// Use strict CORS setup using FRONTEND_URL
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { prisma };
