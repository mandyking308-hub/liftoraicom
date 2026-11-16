import postgres, { type Sql } from "postgres";

export interface TestQueryResult<T = Record<string, unknown>> {
  rows: T[];
}

async function runQuery<T>(sql: Sql, text: string, values: unknown[]): Promise<TestQueryResult<T>> {
  const result = await sql.unsafe(text, values as never[]);
  return { rows: Array.from(result) as T[] };
}

export class TestPoolClient {
  constructor(private readonly sql: Sql, private readonly releaseConnection?: () => void) {}

  query<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<TestQueryResult<T>> {
    return runQuery<T>(this.sql, text, values);
  }

  release(): void {
    this.releaseConnection?.();
  }
}

/** Small pg-compatible test wrapper over the project's existing postgres.js dependency. */
export class TestPool {
  private readonly sql: Sql | null;

  constructor(connectionString?: string) {
    this.sql = connectionString ? postgres(connectionString, { max: 24 }) : null;
  }

  private requireSql(): Sql {
    if (!this.sql) throw new Error("UNIFIED_INBOUND_TEST_DATABASE_URL is required");
    return this.sql;
  }

  query<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<TestQueryResult<T>> {
    return runQuery<T>(this.requireSql(), text, values);
  }

  async connect(): Promise<TestPoolClient> {
    const reserved = await this.requireSql().reserve();
    return new TestPoolClient(reserved, () => reserved.release());
  }

  async end(): Promise<void> {
    if (this.sql) await this.sql.end();
  }
}
