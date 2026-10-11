/// <reference path="../pb_data/types.d.ts" />

// The CSV import creates fasts through the batch API, which is off by default.
migrate(
  (app) => {
    const settings = app.settings()
    settings.batch.enabled = true
    settings.batch.maxRequests = 50
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.batch.enabled = false
    app.save(settings)
  },
)
