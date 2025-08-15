import type { AuditLog, User } from "@shared/schema";
import { getSqlServerPool } from "../db";

export class AuditRepository {
  async findAll(
    limit = 50,
    offset = 0,
  ): Promise<(AuditLog & { user: User })[]> {
    const pool = await getSqlServerPool();
    const result = await pool
      .request()
      .input("limit", limit)
      .input("offset", offset)
      .query(`
        SELECT a.*, u.name as userName, u.email as userEmail
        FROM audit_logs a
        LEFT JOIN users u ON a.userId = u.id
        ORDER BY a.timestamp DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return result.recordset.map((log: any) => ({
      ...log,
      timestamp: log.timestamp
        ? new Date(log.timestamp).getTime()
        : Date.now(),
      user: {
        id: log.userId,
        name: log.userName,
        email: log.userEmail,
      } as User,
    }));
  }

  async create(
    log: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const pool = await getSqlServerPool();
    const result = await pool
      .request()
      .input("userId", log.userId)
      .input("action", log.action)
      .input("entityType", log.entityType)
      .input("entityId", log.entityId)
      .input("oldValues", log.oldValues || null)
      .input("newValues", log.newValues || null)
      .input("metadata", log.metadata || null)
      .query(`
        INSERT INTO audit_logs (userId, action, entityType, entityId, oldValues, newValues, metadata, timestamp)
        OUTPUT INSERTED.*
        VALUES (@userId, @action, @entityType, @entityId, @oldValues, @newValues, @metadata, GETDATE())
      `);

    const record = result.recordset[0];
    return {
      ...record,
      timestamp: record.timestamp
        ? new Date(record.timestamp).getTime()
        : Date.now(),
    } as AuditLog;
  }
}

export const auditRepository = new AuditRepository();
