import type { AuditLog, User } from "@shared/schema";
import { getStorage } from "../db";

export class AuditRepository {
  async findAll(
    limit = 50,
    offset = 0,
  ): Promise<(AuditLog & { user: User })[]> {
    const storage = await getStorage();
    return storage.getAuditLogs(limit, offset);
  }

  async create(
    log: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const storage = await getStorage();
    return storage.createAuditLog(log);
  }
}

export const auditRepository = new AuditRepository();
