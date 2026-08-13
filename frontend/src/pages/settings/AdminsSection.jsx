import { Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import SectionCard from "../../components/SectionCard";
import { formatDate } from "../../utils/format";

export default function AdminsSection({ notifications, telegramConnected, onNotificationsSaved, showToast }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [prefs, setPrefs] = useState(notifications);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  async function loadAdmins() {
    setLoading(true);
    try {
      const data = await apiFetch("/admins");
      setAdmins(data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not load admins.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite() {
    setInviting(true);
    try {
      const data = await apiFetch("/admins/invite", { method: "POST" });
      window.open(data.invite_link, "_blank");
      showToast("Invite link opened — have them press START in Telegram");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not create invite.", "error");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id) {
    try {
      await apiFetch(`/admins/${id}`, { method: "DELETE" });
      setAdmins((a) => a.filter((x) => x.id !== id));
      setRemoveTarget(null);
      showToast("Admin removed");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not remove admin.", "error");
    }
  }

  async function handleSavePrefs() {
    setSavingPrefs(true);
    try {
      const updated = await apiFetch("/settings/notifications", { method: "PUT", body: prefs });
      onNotificationsSaved(updated);
      showToast("Notification preferences saved");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save preferences.", "error");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <SectionCard
      title="Admin notifications"
      description="Anyone connected here gets notified alongside the primary owner."
    >
      <div>
        <Button onClick={handleInvite} disabled={inviting || !telegramConnected}>
          <Send className="h-4 w-4" strokeWidth={2.5} />
          {inviting ? "Creating link..." : "Connect Telegram admin"}
        </Button>
        {!telegramConnected && (
          <p className="mt-1.5 text-xs text-ink-muted">Connect your Telegram bot first.</p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-ink-muted">No additional admins connected yet.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {admin.name || "Unnamed"} <span className="text-ink-muted">({admin.chat_id_masked})</span>
                </p>
                <p className="text-xs text-ink-muted">Connected {formatDate(admin.connected_at)}</p>
              </div>
              <button
                onClick={() => setRemoveTarget(admin)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-error-soft hover:text-error"
                aria-label="Remove admin"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-medium text-ink">Notify for:</p>
        <div className="space-y-2">
          {[
            ["notify_on_lead", "New lead"],
            ["notify_on_payment", "Payment received"],
            ["notify_on_handoff", "AI couldn't answer / human handoff"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              {label}
            </label>
          ))}
        </div>
        <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-3">
          {savingPrefs ? "Saving..." : "Save"}
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => handleRemove(removeTarget.id)}
        title="Remove this admin?"
        description={
          removeTarget
            ? `${removeTarget.name || "This admin"} will stop receiving notifications.`
            : ""
        }
        confirmLabel="Remove"
      />
    </SectionCard>
  );
}
