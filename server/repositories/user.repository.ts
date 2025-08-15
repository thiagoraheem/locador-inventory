import { BaseRepository } from "./base.repository";
import type { User } from "@shared/schema";

export class UserRepository extends BaseRepository<User> {
  async findAll(): Promise<User[]> {
    const storage = await this.getStorage();
    return storage.getUsers();
  }

  async findById(id: string): Promise<User | null> {
    const storage = await this.getStorage();
    return storage.getUser(Number(id));
  }

  async create(data: Partial<User>): Promise<User> {
    const storage = await this.getStorage();
    return storage.createUser(data as any);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const storage = await this.getStorage();
    return storage.updateUser(Number(id), data as any);
  }

  async delete(id: string): Promise<boolean> {
    const storage = await this.getStorage();
    await storage.deleteUser(Number(id));
    return true;
  }
}

export const userRepository = new UserRepository();
