import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client";
import ConfirmTypeDialog from "../../components/ConfirmTypeDialog";
import SectionCard from "../../components/SectionCard";
import { useAuth } from "../../context/AuthContext";

export default function DangerZoneSection({ businessName, showToast }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteKnowledge, setShowDeleteKnowledge] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  async function handleDeleteKnowledge() {
    try {
      const data = await apiFetch("/settings/knowledge", { method: "DELETE" });
      showToast(`Deleted ${data.deleted_count} knowledge item(s)`);
      setShowDeleteKnowledge(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete knowledge items.", "error");
    }
  }

  async function handleDeleteAccount() {
    try {
      await apiFetch("/settings/account", {
        method: "DELETE",
        body: { confirm_name: businessName },
      });
      logout();
      navigate("/app/signin");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete account.", "error");
      throw err;
    }
  }

  return (
    <SectionCard title="Danger zone" danger>
      <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-red-900">Delete all knowledge items</p>
            <p className="text-xs text-red-700/80">Your assistant will have nothing to answer from.</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowDeleteKnowledge(true)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50">
          Delete knowledge
        </button>
      </div>

      <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-red-900">Delete account</p>
            <p className="text-xs text-red-700/80">
              Permanently deletes your business, bot, knowledge, leads, and conversations.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setShowDeleteAccount(true)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50">
          Delete account
        </button>
      </div>

      <ConfirmTypeDialog
        open={showDeleteKnowledge}
        onClose={() => setShowDeleteKnowledge(false)}
        onConfirm={handleDeleteKnowledge}
        title="Delete all knowledge items?"
        description="This can't be undone. Your assistant won't be able to answer any questions until you add new knowledge."
        confirmPhrase="DELETE"
      />

      <ConfirmTypeDialog
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
        description="This permanently deletes your business and everything in it. This can't be undone."
        confirmPhrase={businessName}
      />
    </SectionCard>
  );
}
