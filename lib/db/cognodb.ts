import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getCognoDbDriver(): Driver | null {
  const uri = process.env.COGNODB_URI || process.env.NEO4J_URI;
  const user = process.env.COGNODB_USER || process.env.NEO4J_USER;
  const password = process.env.COGNODB_PASSWORD || process.env.NEO4J_PASSWORD;

  if (!uri) {
    return null;
  }

  if (!driver) {
    driver = neo4j.driver(
      uri,
      user && password ? neo4j.auth.basic(user, password) : undefined
    );
  }

  return driver;
}

export async function executeCypherQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const drv = getCognoDbDriver();
  if (!drv) {
    return [];
  }

  const session: Session = drv.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj: Record<string, any> = {};
      record.keys.forEach((key) => {
        const value = record.get(key);
        obj[String(key)] = formatNeo4jValue(value);
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

function formatNeo4jValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && 'properties' in val) {
    return val.properties;
  }
  if (typeof val === 'object' && 'toNumber' in val) {
    return val.toNumber();
  }
  if (Array.isArray(val)) {
    return val.map(formatNeo4jValue);
  }
  return val;
}

export async function checkDbHealth(): Promise<{ status: string; driverAvailable: boolean }> {
  try {
    const drv = getCognoDbDriver();
    if (!drv) {
      return { status: 'unconfigured', driverAvailable: false };
    }
    const session = drv.session();
    await session.run('RETURN 1 AS val');
    await session.close();
    return { status: 'healthy', driverAvailable: true };
  } catch (err: any) {
    return { status: 'error', driverAvailable: true };
  }
}
