declare module 'better-sqlite3' {
  namespace Database {
    interface Statement {
      get(...params: unknown[]): unknown
      all(...params: unknown[]): unknown[]
      run(...params: unknown[]): unknown
    }

    interface Database {
      pragma(source: string): unknown
      exec(source: string): unknown
      prepare(source: string): Statement
      transaction<T extends (...args: any[]) => unknown>(fn: T): T
      close(): void
    }
  }

  interface DatabaseConstructor {
    new (filename: string): Database.Database
    (filename: string): Database.Database
  }

  const Database: DatabaseConstructor
  export = Database
}
