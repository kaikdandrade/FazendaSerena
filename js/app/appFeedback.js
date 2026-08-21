"use strict";

function setupFeedback() {
  if (!dom.openPlayerFeedback || !dom.playerFeedbackDialog) return;

  const setStatus = (message = "", type = "") => {
    if (!dom.playerFeedbackStatus) return;
    dom.playerFeedbackStatus.textContent = message;
    dom.playerFeedbackStatus.dataset.type = type;
  };

  const refreshAvailability = () => {
    const signedIn = Boolean(window.FirebaseManager?.getUser?.());
    if (dom.playerFeedbackHint) {
      dom.playerFeedbackHint.textContent = signedIn
        ? "Envie uma sugestão, ideia ou relate algo que poderia funcionar melhor."
        : "Conecte sua conta Google em Minha Conta para enviar uma mensagem.";
    }
    if (dom.submitPlayerFeedback) dom.submitPlayerFeedback.disabled = !signedIn;
    return signedIn;
  };

  dom.openPlayerFeedback.addEventListener("click", () => {
    refreshAvailability();
    setStatus("");
    if (typeof dom.playerFeedbackDialog.showModal === "function" && !dom.playerFeedbackDialog.open) {
      dom.playerFeedbackDialog.showModal();
    }
  });

  dom.cancelPlayerFeedback?.addEventListener("click", () => dom.playerFeedbackDialog.close("cancel"));

  dom.playerFeedbackForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!refreshAvailability()) {
      setStatus("Entre com o Google para enviar.", "error");
      return;
    }
    const payload = {
      type: dom.playerFeedbackType?.value || "feedback",
      subject: dom.playerFeedbackSubject?.value || "",
      message: dom.playerFeedbackMessage?.value || ""
    };
    dom.submitPlayerFeedback.disabled = true;
    setStatus("Enviando...", "pending");
    try {
      await window.FirebaseManager.submitPlayerFeedback(payload);
      dom.playerFeedbackForm.reset();
      setStatus("Mensagem enviada. Obrigado!", "success");
      window.setTimeout(() => {
        if (dom.playerFeedbackDialog?.open) dom.playerFeedbackDialog.close("sent");
      }, 650);
    } catch (error) {
      setStatus(window.FirebaseManager.getFriendlyError(error), "error");
    } finally {
      refreshAvailability();
    }
  });

  window.FirebaseManager?.subscribeAuth?.(() => refreshAvailability());
  refreshAvailability();
}
