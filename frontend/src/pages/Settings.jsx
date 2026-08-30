import { AlertTriangle, Bot, Building2, Radio, Truck } from "lucide-react";
import { useMemo, useState } from "react";
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
import DeliveryZonesSection from "./settings/DeliveryZonesSection";
import ProfileSection from "./settings/ProfileSection";
import TelegramSection from "./settings/TelegramSection";

const BASE_TABS = [
  { id: "general", label: "General Profile", icon: Building2 },
  { id: "channels", label: "Channels & Integrations", icon: Radio },
  { id: "ai", label: "AI Assistant Rules", icon: Bot },
  { id: "advanced", label: "Advanced", icon: AlertTriangle },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
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
  const { updateProfile, businessType } = useAuth();
  const isRetail = businessType === "product_retail" || coreSettings?.profile?.business_type === "product_retail";
  const tabs = useMemo(
    () =>
      isRetail
        ? [
            BASE_TABS[0],
            { id: "retail", label: "Retail & Delivery", icon: Truck },
            ...BASE_TABS.slice(1),
          ]
        : BASE_TABS,
    [isRetail],
  );

  return (
    <div>
      <PageHeader title="Settings" description="Manage your workspace, channels, and assistant behavior." />

      {error && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{error}</p>
      )}

      {coreLoading ? (
        <RowListSkeleton rows={4} />
      ) : (
        coreSettings && (
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav className="h-fit rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                    activeTab === id
                      ? "bg-accent-soft text-accent-dark"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>

            <div className="min-w-0 space-y-6">
              {activeTab === "general" && (
                <ProfileSection
                  profile={coreSettings.profile}
                  onSaved={(profile) => {
                    setCoreSettings((s) => ({ ...s, profile }));
                    updateProfile({
                      business_name: profile.name,
                      business_type: profile.business_type,
                      logo_url: profile.logo_url,
                    });
                  }}
                  showToast={addToast}
                />
              )}

              {activeTab === "retail" && isRetail && <DeliveryZonesSection showToast={addToast} />}

              {activeTab === "channels" && (
                <>
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
                </>
              )}

              {activeTab === "ai" && (
                aiLoading ? (
                  <SectionCard title="AI assistant rules">
                    <RowListSkeleton rows={2} />
                  </SectionCard>
                ) : (
                  aiSettings && (
                    <SectionCard title="AI assistant rules" description="Configure how your assistant greets, speaks, and follows business rules.">
                      <AiBehaviorSection
                        aiBehavior={coreSettings.ai_behavior}
                        onSaved={(ai_behavior) => setCoreSettings((s) => ({ ...s, ai_behavior }))}
                        showToast={addToast}
                        embedded
                      />
                      <AIProfileSection
                        profile={aiSettings.ai_profile}
                        rules={aiSettings.business_rules}
                        onProfileSaved={(ai_profile) => setAiSettings((s) => ({ ...s, ai_profile }))}
                        onRulesSaved={(business_rules) => setAiSettings((s) => ({ ...s, business_rules }))}
                        showToast={addToast}
                        embedded
                      />
                    </SectionCard>
                  )
                )
              )}

              {activeTab === "advanced" && (
                <DangerZoneSection businessName={coreSettings.profile.name} showToast={addToast} />
              )}
            </div>
          </div>
        )
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
