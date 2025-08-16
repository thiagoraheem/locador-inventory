import type { RequestHandler } from "express";
import { getStorage } from "../db";

export function requireRoles(roles: string[]): RequestHandler {
  const allowed = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const userRole = (req as any).user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!allowed.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Access denied: insufficient permissions" });
    }
    next();
  };
}

export const requireAuditMode: RequestHandler = async (req: any, res, next) => {
  try {
    const inventoryId = Number(req.params.id);
    if (Number.isNaN(inventoryId)) {
      return res.status(400).json({ message: "Invalid inventory id" });
    }

    const storage = await getStorage();
    const inventory = await storage.getInventory(inventoryId);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    if (inventory.status !== "audit_mode") {
      return res.status(400).json({
        message:
          "This operation is only allowed when inventory is in audit mode.",
      });
    }

    next();
  } catch (error) {
    // Error verifying audit mode
    res.status(500).json({ message: "Failed to verify audit mode" });
  }
};

