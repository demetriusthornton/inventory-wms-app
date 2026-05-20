import React, { useState, useEffect } from "react";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import type { User } from "firebase/auth";
import type { Warehouse } from "../../types";

interface UserSettingsModalProps {
  open: boolean;
  onClose: () => void;
  authUser: User;
  warehouses: Warehouse[];
  defaultWarehouseId: string | null;
  onSetDefaultWarehouse: (id: string | null) => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  open,
  onClose,
  authUser,
  warehouses,
  defaultWarehouseId,
  onSetDefaultWarehouse,
}) => {
  const [activeTab, setActiveTab] = useState<"branch" | "password">("branch");

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    defaultWarehouseId ?? "",
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedBranchId(defaultWarehouseId ?? "");
      setPwError(null);
      setPwSuccess(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, defaultWarehouseId]);

  const handleSaveBranch = () => {
    onSetDefaultWarehouse(selectedBranchId || null);
    onClose();
  };

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(false);

    if (!newPassword || !currentPassword) {
      setPwError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    const email = authUser.email;
    if (!email) {
      setPwError("Cannot change password for this account type.");
      return;
    }

    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPwError("Current password is incorrect.");
      } else if (code === "auth/too-many-requests") {
        setPwError("Too many attempts. Please try again later.");
      } else {
        setPwError("Failed to update password. Please try again.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-xl shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--modal-border)]">
          <h2 className="text-base font-semibold text-[var(--fg)]">User Settings</h2>
          <button
            className="text-[var(--muted)] hover:text-[var(--fg)] text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* User info strip */}
        <div className="px-6 py-3 bg-[var(--surface-1)] border-b border-[var(--modal-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] text-sm font-bold flex-shrink-0">
            {(authUser.displayName || authUser.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--fg)]">
              {authUser.displayName || authUser.email}
            </p>
            {authUser.displayName && (
              <p className="text-xs text-[var(--muted)]">{authUser.email}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--modal-border)]">
          {(["branch", "password"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
              onClick={() => {
                setActiveTab(tab);
                setPwError(null);
                setPwSuccess(false);
              }}
            >
              {tab === "branch" ? "Preferred Branch" : "Change Password"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-5">
          {activeTab === "branch" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Your preferred branch filters inventory, purchase orders, and transfers by default. You can change it at any time.
              </p>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Default Branch
                </label>
                <select
                  className={inputClass}
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  <option value="">— No preference (show all) —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.shortCode ? ` (${w.shortCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selectedBranchId && (
                <p className="text-xs text-[var(--muted)]">
                  Currently filtering to:{" "}
                  <span className="font-medium text-[var(--fg)]">
                    {warehouses.find((w) => w.id === selectedBranchId)?.name ?? selectedBranchId}
                  </span>
                </p>
              )}
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-3">
              {pwError && (
                <div className="p-3 rounded-lg bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-fg)] text-sm">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  Password updated successfully.
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--modal-border)] bg-[var(--modal-footer)] flex justify-end gap-3 rounded-b-xl">
          <button
            className="px-4 py-2 rounded-lg text-sm border border-[var(--outline-border)] bg-[var(--outline-bg)] text-[var(--outline-fg)] hover:bg-[var(--outline-hover)] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          {activeTab === "branch" ? (
            <button
              className="px-4 py-2 rounded-lg text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              onClick={handleSaveBranch}
            >
              Save Branch
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded-lg text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              onClick={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
