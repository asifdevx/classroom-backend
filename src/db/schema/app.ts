import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { Schedule } from "../../types";
import { timestamps } from "../../utils/timeStemp";
import { user } from "./auth";


export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "archived"]);


//! Department schema
 export const Departments = pgTable("departments", {
   id: serial("id").primaryKey(),
   code: varchar("code", { length: 50 }).notNull().unique(),
   name: varchar("name", { length: 100 }).notNull(),
   description: text("description"),
   ...timestamps,
 });

//! Subject schema
 export const Subjects = pgTable("subjects", {
   id: serial("id").primaryKey(),
   departmentId: integer("department_id")
     .references(() => Departments.id, { onDelete: "restrict" })
     .notNull(),
   code: varchar("code", { length: 50 }).notNull().unique(),
   name: varchar("name", { length: 100 }).notNull(),
   description: text("description"),
   ...timestamps,
 });

//! Classes schema

export const Classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => Subjects.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    bannerCldPubId: text("banner_cld_pub_id"),
    bannerUrl: text("banner_url"),
    capacity: integer("capacity").notNull().default(50),
    description: text("description"),
    status: classStatusEnum("status").notNull().default("active"),
    schedules: jsonb("schedules").$type<Schedule[]>().notNull(),

    ...timestamps,
  },
  (table) => ({
    subjectIdIdx: index("classes_subject_id_idx").on(table.subjectId),
    teacherIdIdx: index("classes_teacher_id_idx").on(table.teacherId),
  }),
);


//! Enrollment schema

export const enrollments = pgTable(
  "enrollments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => Classes.id, { onDelete: "cascade" }),

    ...timestamps,
  },
  (table) => ({
    studentIdIdx: index("enrollments_student_id_idx").on(table.studentId),
    classIdIdx: index("enrollments_class_id_idx").on(table.classId),
    studentClassUnique: index("enrollments_student_class_unique").on(table.studentId, table.classId),
  }),
);

export const departmentsRelations = relations(Departments, ({ many }) => ({
  subjects: many(Subjects),
}));

export const subjectsRelations = relations(Subjects, ({ one }) => ({
  department: one(Departments, {
    fields: [Subjects.departmentId],
    references: [Departments.id],
  }),
}));
export const classesRelations = relations(Classes, ({ one, many }) => ({
  subject: one(Subjects, {
    fields: [Classes.subjectId],
    references: [Subjects.id],
  }),
  teacher: one(user, {
    fields: [Classes.teacherId],
    references: [user.id],
  }),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(user, {
    fields: [enrollments.studentId],
    references: [user.id],
  }),
  class: one(Classes, {
    fields: [enrollments.classId],
    references: [Classes.id],
  }),
}));




export type Department = typeof Departments.$inferSelect;
export type NewDepartment = typeof Departments.$inferInsert;

export type Subject = typeof Subjects.$inferSelect;
export type NewSubject = typeof Subjects.$inferInsert;


