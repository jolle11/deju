/// <reference path="../pb_data/types.d.ts" />

// Base color for the "custom" accent, as "#rrggbb".
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    users.fields.add(new TextField({ name: "customColor", max: 7 }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    users.fields.removeByName("customColor")
    app.save(users)
  },
)
