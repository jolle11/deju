# Deploy en Railway

Un proyecto de Railway con tres servicios desde este repo:

| Servicio | Root directory | Notas |
|---|---|---|
| `frontend` | `/` | Nitro (Node). Dominio público. |
| `pocketbase` | `/pocketbase` | Dockerfile. **Volumen montado en `/pb/pb_data`**. Dominio público (el navegador habla con él). Puerto 8090. |
| `notif-worker` | `/worker` | Dockerfile. Sin dominio. |

Configura los "Watch paths" de cada servicio (`/pocketbase/**`, `/worker/**`, y el resto para frontend) para no redeployar todo en cada push.

## Variables

Genera las claves VAPID una vez: `npx web-push generate-vapid-keys`.

**frontend** (se inyectan en build, son públicas)
- `VITE_PB_URL=https://${{pocketbase.RAILWAY_PUBLIC_DOMAIN}}`
- `VITE_VAPID_PUBLIC_KEY=...`

**notif-worker**
- `PB_URL=http://${{pocketbase.RAILWAY_PRIVATE_DOMAIN}}:8090`
- `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:tu@email`

## Primer arranque de PocketBase
1. Abre `https://<pocketbase>/_/` y crea el superuser (o `pocketbase superuser upsert` vía `railway ssh`).
2. Las migraciones de `pocketbase/pb_migrations` se aplican solas al arrancar.
3. En *Settings → Application* pon la URL del frontend y revisa CORS si lo restringes.

## Desarrollo local
```sh
# PocketBase (binario descargado de github.com/pocketbase/pocketbase/releases)
./pocketbase serve --dir=./pocketbase/pb_data --migrationsDir=./pocketbase/pb_migrations
# Frontend: copia .env.example a .env.local
npm run dev
# Worker: copia worker/.env.example a worker/.env
cd worker && npm run dev
```

Las notificaciones push en iOS solo funcionan con la PWA instalada en la pantalla de inicio.
