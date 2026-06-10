import { Router } from "express";
import { getAllSubjects } from "../controlers/subjects";


const router =Router();

// Get all subjects with optional search, department filter, and pagination
router.get("/",getAllSubjects);


export default router;