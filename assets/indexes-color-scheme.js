(() => {
  if (window.indexesColorScheme) return;
  window.indexesColorScheme = true;
  const key = 'indexes_color_scheme_v1';
  const root = document.documentElement;
  const system = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch (error) { /* Storage is optional. */ }
  if (!['light', 'dark'].includes(preference)) preference = null;

  function apply() {
    const mode = preference || (system?.matches ? 'dark' : 'light');
    root.dataset.ixTheme = mode;
    root.style.colorScheme = mode;
    document.querySelectorAll('[data-ix-color-scheme-toggle]').forEach((button) => {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(mode === 'dark'));
      button.setAttribute('aria-label', 'الوضع الليلي');
      button.title = mode === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي';
    });
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-ix-color-scheme-toggle]')) return;
    preference = root.dataset.ixTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch (error) { /* Keep the current page usable. */ }
    apply();
  });
  system?.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply();
  });
  document.addEventListener('shopify:section:load', apply);
  apply();
})();
