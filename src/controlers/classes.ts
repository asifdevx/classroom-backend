import { and, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db";
import { Classes, Subjects, user } from "../db/schema";

export async function getAllClasses(req: Request, res: Response) {
  try {
    const { search , subjectId, teacherId, page = "1", limit = "10" } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterCondition = [];

    if (search && search != undefined) filterCondition.push(ilike(Classes.name, `%${search}%`));
    if (subjectId && subjectId !== "all") filterCondition.push(eq(Classes.subjectId, +subjectId));
    if (teacherId && teacherId !== "all" && typeof teacherId === "string") filterCondition.push(eq(Classes.teacherId, teacherId));

    const whereClause = filterCondition.length > 0 ? and(...filterCondition) : undefined;

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(Classes)
      .leftJoin(Subjects, eq(Classes.subjectId, Subjects.id))
      .leftJoin(user, eq(Classes.teacherId, user.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getTableColumns(Classes),
        subject: {
          ...getTableColumns(Subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(Classes)
      .leftJoin(Subjects, eq(Classes.subjectId, Subjects.id))
      .leftJoin(user, eq(Classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(Classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    return res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error:", error);
    return res.status(500).json({ error: "Failed to fetch classes" });
  }
}

export async function createClasses(req: Request, res: Response) {
  try {
    const createClass = await db
      .insert(Classes)
      .values({ ...req.body, inviteCode: Math.random().toString(36).substring(2, 9), schedules: [] })
      .returning({ id: Classes.id });
    console.log(createClass);

    if (!createClass) throw Error;

    return res.status(201).json({ success: true, message: "Class created successfully" });
  } catch (error) {
    console.error("POST /classes error:", error);
    return res.status(500).json({ error: "Failed to create class" });
  }
}
