import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client";
import Button from "../../components/Button";
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
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Delete all knowledge items</p>
          <p className="text-xs text-ink-muted">Your assistant will have nothing to answer from.</p>
        </div>
        <Button variant="destructive" onClick={() => setShowDeleteKnowledge(true)}>
          Delete knowledge
        </Button>
      </div>

      <div className="flex flex-col items-start gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Delete account</p>
          <p className="text-xs text-ink-muted">
            Permanently deletes your business, bot, knowledge, leads, and conversations.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setShowDeleteAccount(true)}>
          Delete account
        </Button>
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
