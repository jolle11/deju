/// <reference path="../pb_data/types.d.ts" />

// A user can only have one running fast. Two devices pressing "start" at the
// same time used to create two, and the older one stayed open forever.
migrate(
  (app) => {
    // Close duplicates first (each older one ends when the next one started),
    // otherwise the unique index below cannot be created.
    app
      .db()
      .newQuery(`
        UPDATE fasts SET endedAt = (
          SELECT MIN(n.startedAt) FROM fasts n
          WHERE n.user = fasts.user AND n.endedAt = '' AND n.startedAt > fasts.startedAt
        )
        WHERE endedAt = '' AND EXISTS (
          SELECT 1 FROM fasts n
          WHERE n.user = fasts.user AND n.endedAt = '' AND n.startedAt > fasts.startedAt
        )
      `)
      .execute()

    const fasts = app.findCollectionByNameOrId("fasts")
    fasts.addIndex("idx_fasts_one_active", true, "user", "endedAt = ''")
    app.save(fasts)
  },
  (app) => {
    const fasts = app.findCollectionByNameOrId("fasts")
    fasts.removeIndex("idx_fasts_one_active")
    app.save(fasts)
  },
)
