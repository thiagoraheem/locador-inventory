import { getStorage } from "../db";
import { verifyPassword } from "../auth";
import type { RegisterData } from "@shared/schema";

export class AuthService {
  async login(username: string, password: string) {
    const storage = await getStorage();
    const user = await storage.getUserByUsername(username);
    if (!user || !user.isActive) {
      throw new Error(
        user && !user.isActive ? "Usuário desativado" : "Usuário não encontrado"
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error("Credenciais inválidas");
    }

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async register(data: RegisterData) {
    const storage = await getStorage();

    const existingUser = await storage.getUserByUsername(data.username);
    if (existingUser) {
      throw new Error("Nome de usuário já existe");
    }

    const existingEmail = await storage.getUserByEmail(data.email);
    if (existingEmail) {
      throw new Error("Email já cadastrado");
    }

    const { confirmPassword, ...userData } = data;

    const newUser = await storage.createUser({
      ...userData,
      role: "user",
      isActive: true,
    });

    const { password: _password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
