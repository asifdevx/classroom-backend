import cors from "cors";
import express from "express";
const app = express();
const PORT = 8000;

import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

import classesRouter from "./routers/rou.classes";
import subjectsRouter from "./routers/rou.subjects";
import usersRouter from "./routers/rou.users";

import securityMiddleware from "./security/middleware";

app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.use(securityMiddleware);

app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
