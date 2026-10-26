(function () {
  'use strict';

  const config = window.ZONG_DASHBOARD_CONFIG;
  let currentWorkbookVersion = '';
  let refreshBusy = false;
  let lastError = '';

  function reportError(error, toast) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Public workbook refresh failed:', error);
    const loading = document.querySelector('#charts .nd');
    if (loading) loading.textContent = 'Backend load failed: ' + message;
    if (message !== lastError) {
      toast('Backend refresh failed: ' + message);
      lastError = message;
    }
  }

  async function getWorkbookVersion() {
    const response = await fetch(config.workbookUrl, { method: 'HEAD', cache: 'no-store' });
    if (!response.ok) throw new Error('Backend endpoint returned ' + response.status + '.');
    const version = response.headers.get('ETag') || response.headers.get('Last-Modified') || response.headers.get('Content-Length');
    if (!version) throw new Error('The backend endpoint did not return a version header.');
    return version;
  }

  window.refreshGitHubWorkbook = async function (applyWorkbook, toast) {
    if (refreshBusy) return;
    refreshBusy = true;
    try {
      if (!config || !config.workbookUrl) throw new Error('Set the workbook URL in dashboard-config.js.');
      const version = await getWorkbookVersion();
      if (version === currentWorkbookVersion) {
        lastError = '';
        return;
      }
      const response = await fetch(config.workbookUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not download Backend.xlsm (' + response.status + ').');
      await applyWorkbook(await response.blob(), 'Backend.xlsm', false);
      currentWorkbookVersion = version;
      lastError = '';
      toast('Dashboard updated from GitHub backend');
    } catch (error) {
      reportError(error, toast);
    } finally {
      refreshBusy = false;
    }
  };
})();
