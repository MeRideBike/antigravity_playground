(function () {
  try {
    const theme = localStorage.getItem('dashboard_theme');
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    // Storage access restricted (e.g. private browsing or sandboxed context)
  }
})();
