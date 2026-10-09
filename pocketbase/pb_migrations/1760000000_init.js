/// <reference path="../pb_data/types.d.ts" />

const ownerRule = "user = @request.auth.id"

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")

    const fasts = new Collection({
      type: "base",
      name: "fasts",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: `${ownerRule} && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`,
      deleteRule: ownerRule,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: "startedAt", type: "date", required: true },
        { name: "endedAt", type: "date" },
        { name: "targetHours", type: "number", required: true, min: 1, max: 168 },
        { name: "note", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_fasts_user_ended ON fasts (user, endedAt)"],
    })
    app.save(fasts)

    const subs = new Collection({
      type: "base",
      name: "push_subscriptions",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: null,
      deleteRule: ownerRule,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: "endpoint", type: "text", required: true },
        { name: "p256dh", type: "text", required: true },
        { name: "auth", type: "text", required: true },
        { name: "userAgent", type: "text" },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_push_endpoint ON push_subscriptions (endpoint)"],
    })
    app.save(subs)

    // Only the worker (superuser) touches this collection.
    const log = new Collection({
      type: "base",
      name: "notification_log",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "fast", type: "relation", required: true, collectionId: fasts.id, cascadeDelete: true, maxSelect: 1 },
        { name: "kind", type: "text", required: true },
        { name: "sentAt", type: "autodate", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_notif_fast_kind ON notification_log (fast, kind)"],
    })
    app.save(log)
  },
  (app) => {
    for (const name of ["notification_log", "push_subscriptions", "fasts"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
