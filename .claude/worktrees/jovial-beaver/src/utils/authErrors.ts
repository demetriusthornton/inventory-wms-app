import type { AuthError } from "firebase/auth";

export const DEFAULT_AUTH_ERROR_MESSAGE = "Authentication failed.";

export function getAuthErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object" || !("code" in err)) {
    return DEFAULT_AUTH_ERROR_MESSAGE;
  }

  const authError = err as AuthError;
  switch (authError.code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-disabled":
      return "User account disabled.";
    case "auth/user-not-found":
      return "User not found.";
    case "auth/wrong-password":
      return "Invalid password.";
    case "auth/email-already-in-use":
      return "Email already in use.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return DEFAULT_AUTH_ERROR_MESSAGE;
  }
}
