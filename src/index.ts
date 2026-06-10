
import cors from "cors";
import express from "express";
const app = express();
const PORT = 8000;

import subjectsRouter from "./routers/rou.subjects";

app.use(
  cors({
    origin: process.env.FRONTEND_URL, 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    credentials: true, 
  }),
);

// app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/subjects", subjectsRouter);


app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
