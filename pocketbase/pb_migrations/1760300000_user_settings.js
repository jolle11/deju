/// <reference path="../pb_data/types.d.ts" />

// Per-user preferences, synced across devices.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    // "" = follow the device. Otherwise "es" | "ca" | "en".
    users.fields.add(new TextField({ name: "language", max: 8 }))
    // Locale the client actually resolved (used by the worker for notifications).
    users.fields.add(new TextField({ name: "locale", max: 8 }))
    // "" = follow the system. Otherwise "light" | "dark".
    users.fields.add(new TextField({ name: "theme", max: 16 }))
    users.fields.add(new TextField({ name: "accent", max: 16 }))
    // Default fasting goal used when starting a fast. 0 = app default (16h).
    users.fields.add(new NumberField({ name: "targetHours", min: 0, max: 168 }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    for (const name of ["language", "locale", "theme", "accent", "targetHours"]) {
      users.fields.removeByName(name)
    }
    app.save(users)
  },
)
