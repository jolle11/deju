/// <reference path="../pb_data/types.d.ts" />

const ownerRule = "user = @request.auth.id"

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    // 0 = no reminder. Hours to eat after a fast before nudging to start the next one.
    users.fields.add(new NumberField({ name: "eatingWindowHours", min: 0, max: 24 }))
    app.save(users)

    const fasts = app.findCollectionByNameOrId("fasts")
    // 0 = not rated, 1..5 = how the fast felt.
    fasts.fields.add(new NumberField({ name: "rating", min: 0, max: 5, onlyInt: true }))
    app.save(fasts)

    const weights = new Collection({
      type: "base",
      name: "weights",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: `${ownerRule} && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`,
      deleteRule: ownerRule,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: "kg", type: "number", required: true, min: 20, max: 400 },
        { name: "measuredAt", type: "date", required: true },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: ["CREATE INDEX idx_weights_user_measured ON weights (user, measuredAt)"],
    })
    app.save(weights)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("weights"))

    const fasts = app.findCollectionByNameOrId("fasts")
    fasts.fields.removeByName("rating")
    app.save(fasts)

    const users = app.findCollectionByNameOrId("users")
    users.fields.removeByName("eatingWindowHours")
    app.save(users)
  },
)
