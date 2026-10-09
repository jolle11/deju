/// <reference path="../pb_data/types.d.ts" />

// Railway puts PocketBase behind its edge proxy. Without this, e.RealIP() is the
// proxy's (changing) IP, so realtime subscribe requests fail the IP check with
// "400 Invalid realtime client" and logs/rate limits see the wrong client IP.
// Railway's edge sets X-Real-IP and appends the client to X-Forwarded-For.
migrate(
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = ["X-Real-IP", "X-Forwarded-For"]
    // Rightmost XFF entry is the one added by Railway's edge, not client-supplied.
    settings.trustedProxy.useLeftmostIP = false
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = []
    app.save(settings)
  },
)
