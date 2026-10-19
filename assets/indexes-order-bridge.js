(() => {
  "use strict";

  const form = document.querySelector("[data-ix-order-bridge]");
  if (!(form instanceof HTMLFormElement)) return;
  const status = form.querySelector("[data-ix-order-status]");
  const button = form.querySelector('button[type="submit"]');
  const challengeRoot = form.querySelector("[data-ix-turnstile]");
  const rawEndpoint = (form.dataset.orderBridgeUrl || "").trim();
  const siteKey = (form.dataset.turnstileSitekey || "").trim();
  const enabled = form.dataset.orderBridgeEnabled === "true";
  const whatsappNumber = (form.dataset.whatsappNumber || "").replace(/\D/g, "");
  let busy = false;
  let token = null;
  let widgetId = null;
  let currentSignature = "";
  let currentKey = "";

  function say(message, isError) {
    if (!status) return;
    status.hidden = false;
    status.replaceChildren(document.createTextNode(message));
    status.style.color = isError ? "#b42318" : "#067647";
  }

  function refreshButton() {
    if (!button) return;
    const ready = enabled && !!endpoint && !!siteKey && !!token && !busy;
    button.disabled = !ready;
    button.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function safeEndpoint() {
    // Shopify App Proxy only: never send checkout names, phones and addresses
    // to an arbitrary URL configured in the theme editor.
    if (rawEndpoint !== "/apps/indexes-orders") return null;
    try {
      const url = new URL(rawEndpoint, location.origin);
      if (url.protocol !== "https:" || url.origin !== location.origin) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  const endpoint = safeEndpoint();
  if (!enabled || !endpoint || !siteKey || !/^967\d{9}$/.test(whatsappNumber)) {
    say("معاينة فقط: إرسال الطلبات غير مفعّل حتى ربط خادم التسجيل والتحقق منه.", true);
    refreshButton();
    return;
  }

  function resetChallenge() {
    token = null;
    refreshButton();
    if (widgetId !== null && window.turnstile && window.turnstile.reset) {
      try { window.turnstile.reset(widgetId); } catch {}
    }
  }

  function renderChallenge() {
    if (!challengeRoot || widgetId !== null || !window.turnstile) return;
    try {
      widgetId = window.turnstile.render(challengeRoot, {
        sitekey: siteKey,
        action: "indexes_whatsapp_order",
        callback: (value) => {
          token = typeof value === "string" ? value : null;
          refreshButton();
        },
        "expired-callback": resetChallenge,
        "error-callback": () => {
          token = null;
          refreshButton();
          say("تعذر تحميل التحقق من الطلب. حاول تحديث الصفحة.", true);
        }
      });
    } catch {
      say("تعذر تشغيل التحقق الآمن من الطلب.", true);
    }
  }

  if (window.turnstile && window.turnstile.render) {
    renderChallenge();
  } else {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderChallenge, { once: true });
    script.addEventListener("error", () => say("تعذر تحميل التحقق من الطلب.", true), { once: true });
    document.head.appendChild(script);
  }

  async function verifiedCart() {
    const response = await fetch("/cart.js", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحديث السلة. أعد المحاولة.");
    const cart = await response.json();
    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      throw new Error("السلة فارغة. أضف منتجًا قبل إرسال الطلب.");
    }
    const totals = new Map();
    const links = [];
    for (const row of cart.items) {
      const variant = row.variant_id;
      const variantText = String(variant || "");
      const quantity = Number(row.quantity);
      if (!/^\d{1,20}$/.test(variantText) ||
          (typeof variant === "number" && !Number.isSafeInteger(variant)) ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        throw new Error("بعض بيانات منتجات السلة غير صالحة. حدّث السلة.");
      }
      if ((row.properties && Object.keys(row.properties).some((key) => row.properties[key] != null && row.properties[key] !== "")) ||
          row.selling_plan_allocation) {
        throw new Error("تحتوي السلة على خيارات خاصة تحتاج مراجعة قبل تأكيد الطلب.");
      }
      const id = "gid://shopify/ProductVariant/" + variantText;
      totals.set(id, (totals.get(id) || 0) + quantity);
      if (totals.get(id) > 999) throw new Error("الكمية المطلوبة تتجاوز الحد المسموح.");
      if (row.url) {
        try {
          const itemUrl = new URL(row.url, location.origin);
          if (itemUrl.origin === location.origin) links.push(itemUrl.href);
        } catch {}
      }
    }
    if (totals.size > 100) throw new Error("تحتوي السلة على عدد كبير من المنتجات.");
    return {
      items: Array.from(totals, ([id, quantity]) => ({
        productRef: { source: "shopify", id }, quantity
      })),
      links,
      cartToken: String(cart.token || "")
    };
  }

  async function stableKey(signature) {
    if (!crypto || !crypto.subtle || !crypto.randomUUID) {
      throw new Error("المتصفح لا يدعم تأكيد الطلب الآمن.");
    }
    const data = new TextEncoder().encode(signature);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    const hash = Array.from(digest, (x) => x.toString(16).padStart(2, "0")).join("");
    const storageName = "indexes-shopify-order:" + hash;
    if (signature === currentSignature && currentKey) return currentKey;
    let key = null;
    try { key = sessionStorage.getItem(storageName); } catch {}
    if (!key || !/^[a-f0-9-]{36}$/i.test(key)) {
      key = crypto.randomUUID();
      try { sessionStorage.setItem(storageName, key); } catch {}
    }
    currentSignature = signature;
    currentKey = key;
    return key;
  }

  function confirmResponse(result, count) {
    if (!result || result.whatsappReady !== true ||
        typeof result.orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.orderId) ||
        typeof result.draftOrderId !== "string" ||
        !/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(result.draftOrderId) ||
        typeof result.orderNumber !== "string" ||
        result.orderNumber !== "ORD-" + result.orderId.replace(/-/g, "").slice(0, 8).toUpperCase() ||
        result.currency !== "YER" || result.itemsCount !== count ||
        !Number.isFinite(Number(result.total)) ||
        !result.quote || result.quote.currency !== "YER" ||
        !Array.isArray(result.quote.items) || result.quote.items.length !== count ||
        !Number.isFinite(Number(result.quote.total)) ||
        Math.abs(Number(result.quote.total) - Number(result.total)) > 0.01) {
      throw new Error("لم يؤكد الخادم حفظ الطلب في Shopify. لم يُفتح واتساب.");
    }
    return result;
  }

  function whatsappMessage(result, customer, links) {
    const lines = [
      "السلام عليكم، أريد تأكيد طلب من اندكس ستور.",
      "",
      "رقم الطلب: " + result.orderNumber,
      "مرجع Shopify: " + (result.draftOrderName || result.draftOrderId),
      "",
      "الاسم: " + customer.name,
      "رقم واتساب: " + customer.phone,
      "عنوان التسليم: " + customer.address,
      "",
      "المنتجات:"
    ];
    for (const item of result.quote.items) {
      lines.push("- " + item.name + " × " + item.quantity + " (" + item.unitPrice + " ر.ي للوحدة)");
    }
    if (links.length) {
      lines.push("", "روابط المنتجات:");
      for (const link of [...new Set(links)]) lines.push(link);
    }
    lines.push(
      "",
      "الخصم: " + Number(result.quote.discount || 0) + " ر.ي",
      "التوصيل: " + Number(result.quote.shipping || 0) + " ر.ي",
      "الإجمالي المؤكد: " + Number(result.total) + " ر.ي",
      "طريقة الدفع: عند الاستلام"
    );
    if (customer.notes) lines.push("ملاحظات: " + customer.notes);
    return lines.join("\n");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (!token) {
      say("أكمل التحقق من الطلب أولًا.", true);
      return;
    }
    busy = true;
    refreshButton();
    say("جارٍ التحقق من السلة وإنشاء سجل الطلب...");
    try {
      const data = new FormData(form);
      const customer = {
        name: String(data.get("name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        address: [data.get("governorate"), data.get("city")]
          .map((part) => String(part || "").trim()).filter(Boolean).join(" - "),
        notes: String(data.get("notes") || "").trim()
      };
      if (customer.name.length < 2 || customer.address.length < 3) {
        throw new Error("أكمل الاسم وعنوان التسليم بشكل صحيح.");
      }
      const cart = await verifiedCart();
      const signature = JSON.stringify([
        cart.cartToken, cart.items, customer.name, customer.phone,
        customer.address, customer.notes
      ]);
      const key = await stableKey(signature);
      const payload = {
        items: cart.items,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        notes: customer.notes || undefined,
        paymentProvider: "cod",
        idempotencyKey: key,
        turnstileToken: token
      };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: new URL(endpoint, location.origin).origin === location.origin ? "same-origin" : "omit",
        cache: "no-store",
        redirect: "error",
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("تعذر تأكيد الطلب على الخادم. لم يُفتح واتساب.");
      const out = confirmResponse(await response.json(), cart.items.length);
      const waUrl = "https://wa.me/" + whatsappNumber + "?text=" +
        encodeURIComponent(whatsappMessage(out, customer, cart.links));
      document.dispatchEvent(new CustomEvent("indexes:order-created", {
        detail: { orderId: out.orderId, value: Number(out.total), currency: "YER" }
      }));
      say("تم التحقق من تسجيل الطلب " + out.orderNumber + ". ");
      if (status) {
        const link = document.createElement("a");
        link.href = waUrl;
        link.textContent = "فتح واتساب لتأكيد الطلب";
        link.rel = "noopener noreferrer";
        status.appendChild(link);
      }
      // The server has confirmed the durable Shopify and Supabase references.
      // Clear the Shopify cart only after that confirmation.
      try {
        await fetch("/cart/clear.js", {
          method: "POST", credentials: "same-origin", cache: "no-store"
        });
      } catch {}
      location.assign(waUrl);
    } catch (error) {
      say(error instanceof Error ? error.message :
        "تعذر تأكيد الطلب. السلة محفوظة، أعد المحاولة.", true);
      resetChallenge();
    } finally {
      busy = false;
      refreshButton();
    }
  });

  refreshButton();
})();
