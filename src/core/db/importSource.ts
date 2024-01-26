import { db } from '@/core/db/db';
import type { DB } from '@/core/db/schema';
import type { Insertable, Selectable } from 'kysely';

export interface ImportSourceDb {
  create (partial: Insertable<DB['import_source']>): Promise<void>;

  find (id: string): Promise<Selectable<DB['import_source']> | undefined>;
}

export const importSourceDb: ImportSourceDb = {
  async create (partial: Insertable<DB['import_source']>): Promise<void> {
    await db.insertInto('import_source')
      .values(partial)
      .execute();
  },
  async find (id) {
    return db.selectFrom('import_source')
      .selectAll()
      .where('id', '=', eb => eb.val(id))
      .executeTakeFirst();
  },
};