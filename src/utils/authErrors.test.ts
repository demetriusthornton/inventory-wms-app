import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./authErrors";

describe("getAuthErrorMessage", () => {
  it("returns default message for unknown inputs", () => {
    expect(getAuthErrorMessage(null)).toBe("Authentication failed.");
    expect(getAuthErrorMessage(undefined)).toBe("Authentication failed.");
    expect(getAuthErrorMessage("oops")).toBe("Authentication failed.");
    expect(getAuthErrorMessage({})).toBe("Authentication failed.");
  });

  it("maps firebase auth error codes to user messages", () => {
    expect(getAuthErrorMessage({ code: "auth/invalid-email" })).toBe(
      "Invalid email address."
    );
    expect(getAuthErrorMessage({ code: "auth/user-disabled" })).toBe(
      "User account disabled."
    );
    expect(getAuthErrorMessage({ code: "auth/user-not-found" })).toBe(
      "User not found."
    );
    expect(getAuthErrorMessage({ code: "auth/wrong-password" })).toBe(
      "Invalid password."
    );
    expect(getAuthErrorMessage({ code: "auth/email-already-in-use" })).toBe(
      "Email already in use."
    );
    expect(getAuthErrorMessage({ code: "auth/weak-password" })).toBe(
      "Password should be at least 6 characters."
    );
  });
});
