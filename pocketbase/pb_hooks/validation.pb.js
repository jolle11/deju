/// <reference path="../pb_data/types.d.ts" />

// Server-side checks mirroring the client forms, so a direct API
// call or an import can't store impossible ranges. Handlers run isolated:
// everything they need is declared inside.
onRecordValidate((e) => {
  // Tolerates devices whose clock runs a bit ahead of the server's.
  const CLOCK_SKEW_MS = 5 * 60 * 1000
  const record = e.record
  const toMs = (value) => (value ? new Date(String(value).replace(" ", "T")).getTime() : NaN)

  const startedAt = record.getString("startedAt")
  const endedAt = record.getString("endedAt")
  const start = toMs(startedAt)
  const end = toMs(endedAt)
  const limit = Date.now() + CLOCK_SKEW_MS

  if (start > limit) throw new BadRequestError("startedAt can't be in the future")
  if (endedAt && end > limit) throw new BadRequestError("endedAt can't be in the future")
  if (endedAt && end <= start) throw new BadRequestError("endedAt must be after startedAt")

  // Only re-check overlaps when the range changes, so legacy rows stay editable.
  const original = record.isNew() ? null : record.original()
  const moved =
    !original ||
    original.getString("startedAt") !== startedAt ||
    original.getString("endedAt") !== endedAt
  if (moved) {
    // A running fast has no end: it overlaps anything after its start.
    const clashes = $app.findRecordsByFilter(
      "fasts",
      "user = {:user} && id != {:id} && startedAt < {:end} && (endedAt = '' || endedAt > {:start})",
      "",
      1,
      0,
      {
        user: record.getString("user"),
        id: record.id,
        start: startedAt,
        end: endedAt || "9999-12-31 23:59:59.999Z",
      },
    )
    if (clashes.length > 0) throw new BadRequestError("This fast overlaps another one")
  }

  e.next()
}, "fasts")

// A measurement needs at least one value and can't be dated in the future.
onRecordValidate((e) => {
  const CLOCK_SKEW_MS = 5 * 60 * 1000
  const record = e.record
  if (!record.getFloat("weightKg") && !record.getFloat("waistCm"))
    throw new BadRequestError("A measurement needs a weight or a waist value")
  const date = new Date(record.getString("date").replace(" ", "T")).getTime()
  if (date > Date.now() + CLOCK_SKEW_MS) throw new BadRequestError("date can't be in the future")
  e.next()
}, "measurements")
