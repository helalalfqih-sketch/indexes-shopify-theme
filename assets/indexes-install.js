(() => {
'use strict';
let pending = null;
let installed = false;
let opener = null;
const standalone = window.matchMedia('(display-mode: standalone)');
const buttons = () => Array.from(document.querySelectorAll('[data-ix-install]'));
const sync = () => buttons().forEach(button => {
  button.hidden = installed || standalone.matches || navigator.standalone === true;
  button.setAttribute('aria-label', pending ? 'تثبيت تطبيق اندكس ستور' : 'إضافة اندكس ستور للشاشة الرئيسية');
  const label = button.querySelector('[data-ix-install-label]');
  if (label) label.textContent = pending ? 'تثبيت التطبيق' : 'التطبيق';
});
window.addEventListener('beforeinstallprompt', event => {
  if (!event.isTrusted) return;
  event.preventDefault();
  pending = event;
  sync();
});
window.addEventListener('appinstalled', event => {
  if (!event.isTrusted) return;
  installed = true;
  pending = null;
  const dialog = document.getElementById('ix-install-dialog');
  if (dialog && dialog.open) dialog.close();
  sync();
});
const showHelp = () => {
  const dialog = document.getElementById('ix-install-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const help = document.getElementById('ix-install-help');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  help.textContent = ios
    ? 'افتح المتجر في Safari، ثم اختر مشاركة ← إضافة إلى الشاشة الرئيسية إذا كان الخيار متاحًا.'
    : 'من قائمة المتصفح، ابحث عن «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا كان الخيار متاحًا. قد تكون الإضافة اختصارًا بحسب المتصفح.';
  if (!dialog.open) dialog.showModal();
};
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-ix-install]');
  if (!button || button.disabled) return;
  opener = button;
  if (!pending) { showHelp(); return; }
  const prompt = pending;
  pending = null;
  button.disabled = true;
  try { await prompt.prompt(); await prompt.userChoice; }
  catch (_) { showHelp(); }
  finally { button.disabled = false; sync(); }
});
const ready = () => {
  const dialog = document.getElementById('ix-install-dialog');
  if (dialog) dialog.addEventListener('close', () => { if (opener && !opener.hidden) opener.focus(); });
  sync();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true}); else ready();
standalone.addEventListener('change', sync);
})();
