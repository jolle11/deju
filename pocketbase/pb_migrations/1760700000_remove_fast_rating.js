/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const fasts = app.findCollectionByNameOrId("fasts")
    fasts.fields.removeByName("rating")
    app.save(fasts)
  },
  (app) => {
    const fasts = app.findCollectionByNameOrId("fasts")
    // Restoring the field cannot recover previously removed ratings.
    fasts.fields.add(new NumberField({ name: "rating", min: 0, max: 5, onlyInt: true }))
    app.save(fasts)
  },
)
