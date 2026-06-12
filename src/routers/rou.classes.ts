import { Router } from "express";
import { createClasses, getAllClasses } from "../controlers/classes";

const router = Router();

router.get("/",getAllClasses);
router.post("/",createClasses);

export default router;