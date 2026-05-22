import { getDb } from './db/migrations';

interface FactRow {
  id: string;
  region: string;
  category: string;
}

export async function pickFact(userId: string): Promise<string | null> {
  const db = await getDb();

  const allFacts = await db.getAllAsync<FactRow>(
    'SELECT id, region, category FROM facts WHERE active = 1',
  );
  if (allFacts.length === 0) return null;

  const assigned = await db.getAllAsync<{ fact_id: string }>(
    'SELECT fact_id FROM fact_assignments WHERE user_id = ? AND deleted = 0',
    [userId],
  );
  const assignedIds = new Set(assigned.map((r) => r.fact_id));

  let pool = allFacts.filter((f) => !assignedIds.has(f.id));

  // All facts assigned — recycle, preferring least-recently-assigned
  if (pool.length === 0) pool = allFacts;

  // Region and category counts from existing assignments
  const assignedFacts = await db.getAllAsync<{ region: string; category: string }>(
    `SELECT f.region, f.category
     FROM facts f
     INNER JOIN fact_assignments fa ON fa.fact_id = f.id
     WHERE fa.user_id = ? AND fa.deleted = 0`,
    [userId],
  );
  const regionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const { region, category } of assignedFacts) {
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  // Lower score = better candidate
  const scored = pool.map((f) => ({
    id: f.id,
    score:
      (regionCounts.get(f.region) ?? 0) +
      (categoryCounts.get(f.category) ?? 0) * 0.5 +
      Math.random() * 0.5,
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored[0].id;
}
