// Auth type definitions — JWT payload, login input, auth result

export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';

export type JwtPayload = {
  sub: string;       // user.id (cuid)
  jti: string;       // session.id (cuid)
  email: string;
  role: Role;
  school: string | null;
  iat: number;
  exp: number;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };
