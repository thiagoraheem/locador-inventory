import { getStorage } from "../db";

export class UserService {
  async getUsers() {
    const storage = await getStorage();
    return storage.getUsers();
  }

  async createUser(data: any, actorId: number) {
    const storage = await getStorage();
    const user = await storage.createUser(data);

    await storage.createAuditLog({
      userId: actorId,
      action: "CREATE",
      entityType: "USER",
      entityId: user.id.toString(),
      oldValues: "",
      newValues: JSON.stringify({ ...data, password: "[REDACTED]" }),
      metadata: "",
    });

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, data: any, actorId: number) {
    const storage = await getStorage();
    const oldUser = await storage.getUser(id);
    if (!oldUser) {
      return null;
    }

    const user = await storage.updateUser(id, data);

    await storage.createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entityType: "USER",
      entityId: id,
      oldValues: JSON.stringify({ ...oldUser, password: "[REDACTED]" }),
      newValues: JSON.stringify({
        ...data,
        password: data.password ? "[REDACTED]" : undefined,
      }),
    });

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(id: string, actorId: number) {
    const storage = await getStorage();
    const oldUser = await storage.getUser(id);
    if (!oldUser) {
      return false;
    }

    await storage.deleteUser(id);

    await storage.createAuditLog({
      userId: actorId,
      action: "DELETE",
      entityType: "USER",
      entityId: id,
      oldValues: JSON.stringify(oldUser),
      newValues: "",
      metadata: "",
    });

    return true;
  }
}

export const userService = new UserService();
