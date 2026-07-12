import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import PageHeader from "../components/PageHeader";
import { RowListSkeleton } from "../components/Skeleton";
import { ToastContainer, useToasts } from "../components/Toast";
import AdminsSection from "./settings/AdminsSection";
import AiBehaviorSection from "./settings/AiBehaviorSection";
import DangerZoneSection from "./settings/DangerZoneSection";
import ProfileSection from "./settings/ProfileSection";
import TelegramSection from "./settings/TelegramSection";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toasts, addToast } = useToasts();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch("/settings");
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Settings" description="Manage your business, bot, and assistant." />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {loading ? (
        <RowListSkeleton rows={4} />
      ) : (
        settings && (
          <div className="space-y-6">
            <ProfileSection
              profile={settings.profile}
              onSaved={(profile) => setSettings((s) => ({ ...s, profile }))}
              showToast={addToast}
            />
            <TelegramSection
              telegram={settings.telegram}
              onSaved={(telegram) => setSettings((s) => ({ ...s, telegram }))}
              showToast={addToast}
            />
            <AdminsSection
              notifications={settings.notifications}
              telegramConnected={settings.telegram.connected}
              onNotificationsSaved={(notifications) => setSettings((s) => ({ ...s, notifications }))}
              showToast={addToast}
            />
            <AiBehaviorSection
              aiBehavior={settings.ai_behavior}
              onSaved={(ai_behavior) => setSettings((s) => ({ ...s, ai_behavior }))}
              showToast={addToast}
            />
            <DangerZoneSection businessName={settings.profile.name} showToast={addToast} />
          </div>
        )
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
