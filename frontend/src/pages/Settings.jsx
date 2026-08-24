import { ApiError } from "../api/client";
import { useCachedApi } from "../api/useCachedApi";
import PageHeader from "../components/PageHeader";
import { RowListSkeleton } from "../components/Skeleton";
import SectionCard from "../components/SectionCard";
import { ToastContainer, useToasts } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import AdminsSection from "./settings/AdminsSection";
import AiBehaviorSection from "./settings/AiBehaviorSection";
import AIProfileSection from "./settings/AIProfileSection";
import DangerZoneSection from "./settings/DangerZoneSection";
import ProfileSection from "./settings/ProfileSection";
import TelegramSection from "./settings/TelegramSection";

export default function Settings() {
  const {
    data: coreSettings,
    setData: setCoreSettings,
    loading: coreLoading,
    error: coreLoadError,
  } = useCachedApi("/settings/core", null);
  const {
    data: aiSettings,
    setData: setAiSettings,
    loading: aiLoading,
    error: aiLoadError,
  } = useCachedApi("/settings/ai-profile", null);
  const loadError = coreLoadError || aiLoadError;
  const error = loadError instanceof ApiError ? loadError.message : loadError;
  const { toasts, addToast } = useToasts();
  const { updateProfile } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your business, bot, and assistant." />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {coreLoading ? (
        <RowListSkeleton rows={4} />
      ) : (
        coreSettings && (
          <div className="space-y-6">
            <ProfileSection
              profile={coreSettings.profile}
              onSaved={(profile) => {
                setCoreSettings((s) => ({ ...s, profile }));
                updateProfile({ business_name: profile.name, logo_url: profile.logo_url });
              }}
              showToast={addToast}
            />
            <TelegramSection
              telegram={coreSettings.telegram}
              onSaved={(telegram) => setCoreSettings((s) => ({ ...s, telegram }))}
              showToast={addToast}
            />
            <AdminsSection
              notifications={coreSettings.notifications}
              telegramConnected={coreSettings.telegram.connected}
              onNotificationsSaved={(notifications) => setCoreSettings((s) => ({ ...s, notifications }))}
              showToast={addToast}
            />
            <AiBehaviorSection
              aiBehavior={coreSettings.ai_behavior}
              onSaved={(ai_behavior) => setCoreSettings((s) => ({ ...s, ai_behavior }))}
              showToast={addToast}
            />
            {aiLoading ? (
              <SectionCard title="AI profile and business rules">
                <RowListSkeleton rows={2} />
              </SectionCard>
            ) : (
              aiSettings && (
                <AIProfileSection
                  profile={aiSettings.ai_profile}
                  rules={aiSettings.business_rules}
                  onProfileSaved={(ai_profile) => setAiSettings((s) => ({ ...s, ai_profile }))}
                  onRulesSaved={(business_rules) => setAiSettings((s) => ({ ...s, business_rules }))}
                  showToast={addToast}
                />
              )
            )}
            <DangerZoneSection businessName={coreSettings.profile.name} showToast={addToast} />
          </div>
        )
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
