import { and, eq, ilike, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db";
import { Departments, Subjects } from "../db/schema";

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const { search, department, page = "1", limit = "10" } = req.query;
    const currentPage = Math.max(1, Number(page) || 1);
    const limitPerPage = Math.max(1, Number(limit) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions: any[] = [];

    if (search) {
      const term = String(search);
      filterConditions.push(or(ilike(Subjects.name, `%${term}%`), ilike(Subjects.description, `%${term}%`)));
    }

    if (department) {
      filterConditions.push(ilike(Departments.name, `%${String(department)}%`));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Count must include the same JOIN and WHERE as the main query
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Subjects)
      .leftJoin(Departments, eq(Subjects.departmentId, Departments.id))
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count ?? 0);

    const subjectsList = await db
      .select({
        id: Subjects.id,
        code: Subjects.code,
        name: Subjects.name,
        description: Subjects.description,
        createdAt: Subjects.createdAt,
        updatedAt: Subjects.updatedAt,
        departmentName: Departments.name,
        departmentId: Departments.id,
      })
      .from(Subjects)
      .leftJoin(Departments, eq(Subjects.departmentId, Departments.id))
      .where(whereClause)
      .offset(offset)
      .limit(limitPerPage)
      .orderBy(Subjects.createdAt);
      
    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("getAllSubjects error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
