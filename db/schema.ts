import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const studyFields = sqliteTable('study_fields', {
 userId:text('user_id').notNull(), unitId:text('unit_id').notNull(), field:text('field').notNull(),
 value:text('value').notNull(), revision:integer('revision').notNull(), mutationId:text('mutation_id').notNull(),
}, t=>[primaryKey({columns:[t.userId,t.unitId,t.field]})]);
