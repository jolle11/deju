import { defineRailway, github, project, service, volume } from "railway/iac";

const REGION = "europe-west4-drams3a";
const MB = 1024 * 1024;
const limits = (cpu: number, memoryMB: number) => ({ containers: { cpu, memoryBytes: memoryMB * MB } });

export default defineRailway(() => {
  const pocketbaseVolume = volume("pocketbase-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 50000,
  });

  // SQLite + in-memory realtime clients: must stay at exactly 1 replica and never sleep.
  const pocketbase = service("pocketbase", {
    source: github("jolle11/deju", { branch: "main", checkSuites: false, rootDirectory: "/pocketbase" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile", watchPatterns: ["/pocketbase/**"] },
    healthcheck: "/api/health",
    replicas: { [REGION]: 1 },
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10, sleepApplication: false, limitOverride: limits(1, 1024) },
    volumeMounts: { "/pb/pb_data": pocketbaseVolume },
  });

  // Long-running scheduler: restart even on a clean exit, otherwise notifications stop silently.
  const notifWorker = service("notif-worker", {
    source: github("jolle11/deju", { branch: "main", checkSuites: false, rootDirectory: "/worker" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile", watchPatterns: ["/worker/**"] },
    replicas: { [REGION]: 1 },
    deploy: { restartPolicyType: "ALWAYS", sleepApplication: false, limitOverride: limits(0.5, 256) },
  });

  // Stateless SSR frontend: can sleep when idle.
  const deju = service("deju", {
    source: github("jolle11/deju", { branch: "main", checkSuites: false }),
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      watchPatterns: [
        "/src/**",
        "/public/**",
        "/package.json",
        "/package-lock.json",
        "/vite.config.ts",
        "/tsconfig.json",
        "/tsr.config.json",
        "/components.json",
        "/Dockerfile",
        "/.dockerignore",
        "/worker/src/zone-starts.ts",
      ],
    },
    healthcheck: "/",
    replicas: { [REGION]: 1 },
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10, sleepApplication: true, limitOverride: limits(1, 512) },
  });

  return project("deju", {
    variables: { managed: false },
    resources: [pocketbase, notifWorker, deju, pocketbaseVolume],
  });
});
