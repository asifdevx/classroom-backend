import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

//! Department schema
 const departmentSchema = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ...timestamps,
});

//! Subject schema
 const subjectSchema = pgTable("subjects", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id")
    .references(() => departmentSchema.id, { onDelete: "restrict" })
    .notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export const departmentsRelations = relations(departmentSchema, ({ many }) => ({
  subjects: many(subjectSchema),
}));

export const subjectsRelations = relations(subjectSchema, ({ one }) => ({
  department: one(departmentSchema, {
    fields: [subjectSchema.departmentId],
    references: [departmentSchema.id],
  }),
}));

export type Department = typeof departmentSchema.$inferSelect;
export type NewDepartment = typeof departmentSchema.$inferInsert;

export type Subject = typeof subjectSchema.$inferSelect;
export type NewSubject = typeof subjectSchema.$inferInsert;



export const Departments = departmentSchema;
export const Subjects = subjectSchema;