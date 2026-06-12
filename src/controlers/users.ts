import { and, desc, eq, ilike } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { UserRole } from "../types";

export async function getUsersByFilters(req: Request, res: Response) {
  try {
    const { search, role } = req.query as { search?: string; role?: string };
    const filterConditions = [];

    if (search) {
      filterConditions.push(ilike(user.name, `%${search}%`));
    }
    if (role) {
      filterConditions.push(eq(user.role, role as UserRole));
    }
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;
    // Implementation for fetching users based on filters
    const filterUsers = await db.select().from(user).where(whereClause).orderBy(desc(user.createdAt));
    return res.status(200).json({ data: filterUsers });
  } catch (error) {
    console.error("GET /users error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}
