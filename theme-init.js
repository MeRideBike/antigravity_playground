(function () {
  try {
    const raw = localStorage.getItem('dashboard_theme');
    const theme = (raw === 'light' || raw === 'dark') ? raw : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
