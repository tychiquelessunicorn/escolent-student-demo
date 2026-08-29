/**
 * One-shot: purge gibberish test Spaces from Redis and clear their overrides.
 * Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in the environment.
 *
 *   UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… npx tsx scripts/purge-gibberish-spaces.ts
 */

import { listSpaces, purgeGibberishTestSpaces } from "../lib/space-store";
import { isRedisConfigured } from "../lib/rate-limit";

async function main() {
  if (!isRedisConfigured()) {
    console.error("Redis not configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    process.exit(1);
  }

  const before = await listSpaces();
  console.log(
    "Catalog before:",
    before.map((space) => `${space.id}:${space.name}`).join(", ") || "(empty)",
  );

  const result = await purgeGibberishTestSpaces({
    namePattern: /^jhfkgkjujn$/i,
  });

  const after = await listSpaces();
  console.log(
    "Removed:",
    result.removed.map((space) => `${space.id}:${space.name}`),
  );
  console.log("Restored student overrides:", result.restoredStudentIds);
  console.log(
    "Catalog after:",
    after.map((space) => `${space.id}:${space.name}`).join(", ") || "(empty)",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
