import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import type { AuthError } from "firebase/auth";

interface AuthPageProps {
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.endsWith("@bluelinxco.com")) {
          setError("Please use your @bluelinxco.com email address.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        setError(
          "Verification email sent. Please check your inbox to complete registration."
        );
        setIsRegistering(false);
        return;
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
          await signOut(auth);
          setError(
            "Please verify your email before signing in. We sent you a new verification email."
          );
          return;
        }
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      const authError = err as AuthError;
      let msg = "Authentication failed.";
      if (authError.code === "auth/invalid-email")
        msg = "Invalid email address.";
      if (authError.code === "auth/user-disabled")
        msg = "User account disabled.";
      if (authError.code === "auth/user-not-found") msg = "User not found.";
      if (authError.code === "auth/wrong-password") msg = "Invalid password.";
      if (authError.code === "auth/email-already-in-use")
        msg = "Email already in use.";
      if (authError.code === "auth/weak-password")
        msg = "Password should be at least 6 characters.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--fg)]">
            In Stock - IMS
          </h1>
          <p className="text-[var(--muted)] mt-2">
            {isRegistering ? "Create a new account" : "Sign in to your account"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg text-[var(--error-fg)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2 bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2 bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0ea5e9] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0284c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? "Processing..."
              : isRegistering
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-sm text-[#0ea5e9] hover:underline font-medium"
          >
            {isRegistering
              ? "Already have an account? Sign in"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
