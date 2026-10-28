/// <reference path="../pb_data/types.d.ts" />

const ownerRule = "user = @request.auth.id"

// Optional body measurements (weight, waist), opt-in per user.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    // "" = not asked yet. Otherwise "on" | "off".
    users.fields.add(new TextField({ name: "bodyTracking", max: 3 }))
    app.save(users)

    const measurements = new Collection({
      type: "base",
      name: "measurements",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: `${ownerRule} && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`,
      deleteRule: ownerRule,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: "date", type: "date", required: true },
        { name: "weightKg", type: "number", min: 20, max: 400 },
        { name: "waistCm", type: "number", min: 20, max: 300 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_measurements_user_date ON measurements (user, date)"],
    })
    app.save(measurements)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("measurements"))
    const users = app.findCollectionByNameOrId("users")
    users.fields.removeByName("bodyTracking")
    app.save(users)
  },
)
