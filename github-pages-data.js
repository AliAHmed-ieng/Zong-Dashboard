(function () {
  'use strict';

  const config = window.ZONG_DASHBOARD_CONFIG;
  const RELEASE_CHECK_INTERVAL_MS = 70_000;
  let currentWorkbookVersion = '';
  let pendingWorkbookVersion = '';
  let lastReleaseCheck = 0;
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

  function setLoadingStatus(message) {
    const status = document.querySelector('#charts .nd');
    if (status) status.textContent = message;
  }

  async function getLatestReleaseTag() {
    const now = Date.now();
    if (now - lastReleaseCheck < RELEASE_CHECK_INTERVAL_MS) return '';
    lastReleaseCheck = now;

    const response = await fetch(config.latestReleaseApiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('GitHub Releases API returned ' + response.status + '.');
    const release = await response.json();
    if (typeof release.tag_name !== 'string' || !release.tag_name) {
      throw new Error('GitHub did not return a latest published release tag.');
    }
    return release.tag_name;
  }

  window.refreshGitHubWorkbook = async function (applyWorkbook, toast) {
    if (refreshBusy) return;
    refreshBusy = true;
    try {
      setLoadingStatus('Checking for workbook updates...');
      if (!config || !config.latestReleaseApiUrl || !config.backendPath) {
        throw new Error('Set the release API URL and backend path in dashboard-config.js.');
      }

      const version = pendingWorkbookVersion || await getLatestReleaseTag();
      if (!version || version === currentWorkbookVersion) {
        lastError = '';
        return;
      }
      pendingWorkbookVersion = version;

      const workbookUrl = new URL(config.backendPath + encodeURIComponent(version) + '/Backend.xlsm', document.baseURI);
      setLoadingStatus('Downloading backend workbook (~45 MB)...');
      const response = await fetch(workbookUrl.href, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not download the workbook for release ' + version + ' (' + response.status + ').');
      const workbook = await response.blob();
      setLoadingStatus('Reading workbook data...');
      await applyWorkbook(workbook, 'Backend.xlsm', false);
      currentWorkbookVersion = version;
      pendingWorkbookVersion = '';
      lastError = '';
      toast('Dashboard updated from release ' + version);
    } catch (error) {
      reportError(error, toast);
    } finally {
      refreshBusy = false;
    }
  };
})();
