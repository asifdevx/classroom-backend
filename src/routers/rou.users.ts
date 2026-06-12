import { Router } from "express";
import { getUsersByFilters } from "../controlers/users";


const router = Router();

// Get all users with optional search, role filter, and pagination
router.get("/",getUsersByFilters)

export default router;