(() => {
  "use strict";
  let inFlight = false;
  function notice(message) {
    let el = document.getElementById("indexes-quick-order-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "indexes-quick-order-status";
      el.setAttribute("role", "alert");
      el.setAttribute("aria-live", "assertive");
      el.style.cssText = "position:fixed;bottom:88px;left:16px;right:16px;max-width:440px;margin:auto;padding:14px 18px;z-index:9999;border-radius:14px;background:#fff;color:#b42318;border:1px solid #fecdca;box-shadow:0 12px 35px #0002;text-align:center;direction:rtl";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
  }

  document.addEventListener("click", async (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest("[data-ix-quick-order]") : null;
    if (!trigger || trigger.disabled) return;
    event.preventDefault();
    if (inFlight) return;

    const form = trigger.closest("form");
    const selector = form?.parentElement?.querySelector("[data-ix-variant-select]");
    const selected = selector?.selectedOptions?.[0];
    if (selected && selected.dataset.available === "false") {
      notice("هذا الخيار غير متوفر حاليًا.");
      return;
    }
    const rawId = form?.querySelector('input[name="id"]')?.value || trigger.dataset.variantId;
    const id = Number(rawId);
    const qtyField = form?.querySelector('input[name="quantity"]');
    const quantity = qtyField ? Number(qtyField.value) : 1;
    if (!/^\d{1,20}$/.test(String(rawId || "")) ||
        !Number.isSafeInteger(id) || !Number.isInteger(quantity) ||
        quantity < 1 || quantity > 999) {
      notice("تعذر تحديد المنتج أو الكمية. حدّث الصفحة.");
      return;
    }

    inFlight = true;
    trigger.disabled = true;
    trigger.setAttribute("aria-busy", "true");
    try {
      const root = window.Shopify?.routes?.root || "/";
      const response = await fetch(root + "cart/add.js", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ id, quantity })
      });
      if (!response.ok) throw new Error("تعذر إضافة المنتج إلى السلة. تحقق من التوفر.");
      window.location.assign("/pages/complete-order");
    } catch (error) {
      notice(error instanceof Error ? error.message : "تعذر بدء الطلب. حاول مرة أخرى.");
      inFlight = false;
      trigger.disabled = false;
      trigger.removeAttribute("aria-busy");
    }
  });
})();