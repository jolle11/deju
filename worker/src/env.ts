function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var ${name}`)
  return value
}

export const env = {
  pbUrl: required('PB_URL'),
  pbEmail: required('PB_SUPERUSER_EMAIL'),
  pbPassword: required('PB_SUPERUSER_PASSWORD'),
  vapidPublicKey: required('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: required('VAPID_PRIVATE_KEY'),
  vapidSubject: required('VAPID_SUBJECT'),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000,
}
