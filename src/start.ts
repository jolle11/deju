import { createStart } from '@tanstack/react-start'

// The app talks to PocketBase straight from the browser, so render on the client.
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
