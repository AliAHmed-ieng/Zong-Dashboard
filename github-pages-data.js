(function () {
  'use strict';

  const config = window.ZONG_DASHBOARD_CONFIG;
  const RELEASE_CHECK_INTERVAL_MS = 70_000;
  const DEPLOYMENT_GRACE_PERIOD_MS = 90_000;
  let currentWorkbookVersion = '';
  let pendingWorkbookVersion = '';
  let pendingWorkbookReadyAt = 0;
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

  async function getLatestRelease() {
    const now = Date.now();
    if (now - lastReleaseCheck < RELEASE_CHECK_INTERVAL_MS) return null;
    lastReleaseCheck = now;
    const response = await fetch(config.latestReleaseApiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!response.ok) {
      // Anonymous access from GitHub Pages may be rate-limited (403) or lack
      // permission to read the releases API. That is expected for the public demo:
      // fall back to the static snapshot instead of surfacing an error toast.
      console.warn('Could not check for workbook releases (status ' + response.status + '); using static snapshot.');
      return null;
    }
    const release = await response.json();
    if (typeof release.tag_name !== 'string' || !release.tag_name) {
      throw new Error('GitHub did not return a latest published release tag.');
    }
    const publishedAt = Date.parse(release.published_at);
    return {
      tag: release.tag_name,
      readyAt: (Number.isFinite(publishedAt) ? publishedAt : now) + DEPLOYMENT_GRACE_PERIOD_MS
    };
  }

  window.refreshGitHubWorkbook = async function (applyWorkbook, toast) {
    if (refreshBusy) return;
    refreshBusy = true;
    try {
      setLoadingStatus('Checking for workbook updates...');
      if (!config || !config.latestReleaseApiUrl || !config.backendPath) {
        throw new Error('Set the release API URL and backend path in dashboard-config.js.');
      }

      const latestRelease = await getLatestRelease();
      if (latestRelease) {
        if (latestRelease.tag === currentWorkbookVersion) {
          pendingWorkbookVersion = '';
          pendingWorkbookReadyAt = 0;
          lastError = '';
          return;
        }
        if (latestRelease.tag !== pendingWorkbookVersion) {
          pendingWorkbookVersion = latestRelease.tag;
          pendingWorkbookReadyAt = latestRelease.readyAt;
        }
      }

      if (!pendingWorkbookVersion) return;
      const release = {
        tag: pendingWorkbookVersion,
        readyAt: pendingWorkbookReadyAt
      };
      if (Date.now() < release.readyAt) {
        setLoadingStatus('Waiting for the new release to finish deploying...');
        return;
      }

      const workbookUrl = new URL(config.backendPath + encodeURIComponent(release.tag) + '.xlsm', document.baseURI);
      workbookUrl.searchParams.set('retry', String(Math.floor(Date.now() / 1000)));
      setLoadingStatus('Downloading backend workbook (~45 MB)...');
      const response = await fetch(workbookUrl.href, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not download the workbook for release ' + release.tag + ' (' + response.status + ').');
      const workbook = await response.blob();
      setLoadingStatus('Reading workbook data...');
      await applyWorkbook(workbook, 'Backend.xlsm', false);
      currentWorkbookVersion = release.tag;
      pendingWorkbookVersion = '';
      pendingWorkbookReadyAt = 0;
      lastError = '';
      toast('Dashboard updated from release ' + release.tag);
    } catch (error) {
      reportError(error, toast);
    } finally {
      refreshBusy = false;
    }
  };
})();
