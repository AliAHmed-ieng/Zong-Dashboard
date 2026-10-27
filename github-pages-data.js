(function () {
  'use strict';

  const config = window.ZONG_DASHBOARD_CONFIG;
  const RELEASE_CHECK_INTERVAL_MS = 30_000;
  const DEPLOYMENT_GRACE_PERIOD_MS = 90_000;
  const FETCH_TIMEOUT_MS = 15_000;
  let currentWorkbookVersion = localStorage.getItem('zongdash-tag') || '';
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

  function timeoutFetch(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...init, signal: controller.signal }).then(function (response) {
      clearTimeout(timer);
      return response;
    }, function (error) {
      clearTimeout(timer);
      throw error;
    });
  }

  async function getLatestRelease() {
    const now = Date.now();
    if (now - lastReleaseCheck < RELEASE_CHECK_INTERVAL_MS) return null;
    lastReleaseCheck = now;
    const response = await timeoutFetch(config.latestReleaseApiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!response.ok) {
      // Anonymous access from GitHub Pages may be rate-limited (403) or lack
      // permission to read the releases API. Expected for the public demo:
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

  window.refreshGitHubWorkbook = async function (applyWorkbook, toast, latestReleaseOverride) {
    if (refreshBusy) return;
    refreshBusy = true;
    try {
      setLoadingStatus('Checking for workbook updates...');
      if (!config || !config.latestReleaseApiUrl || !config.backendPath) {
        throw new Error('Set the release API URL and backend path in dashboard-config.js.');
      }

      const latestRelease = (latestReleaseOverride !== undefined && latestReleaseOverride !== null) ? latestReleaseOverride : await getLatestRelease();
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

      if (!pendingWorkbookVersion) {
        if (!DATA) setLoadingStatus('Could not reach release API (rate limit?). Retrying shortly...');
        else setLoadingStatus('');
        return;
      }

      const tag = pendingWorkbookVersion;
      const workbookUrl = new URL(config.backendPath + encodeURIComponent(tag) + '.xlsm', document.baseURI);
      let response = null;
      for (let attempt = 1; attempt <= 15; attempt++) {
        workbookUrl.searchParams.set('retry', String(Math.floor(Date.now() / 1000)));
        setLoadingStatus('Downloading backend workbook ' + tag + ' (attempt ' + attempt + ')...');
        response = await timeoutFetch(workbookUrl.href, { cache: 'no-store' });
        if (response.ok) break;
        if (response.status === 404) {
          setLoadingStatus('Waiting for deployment to finish... (attempt ' + attempt + '/15)');
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        throw new Error('Could not download the workbook for release ' + tag + ' (' + response.status + ').');
      }
      if (!response || !response.ok) throw new Error('Workbook not available after retries for ' + tag + '.');

      const workbook = await response.blob();
      setLoadingStatus('Reading workbook data...');
      await applyWorkbook(workbook, 'Backend.xlsm', false);
      currentWorkbookVersion = tag;
      localStorage.setItem('zongdash-tag', tag);
      pendingWorkbookVersion = '';
      lastError = '';
      setLoadingStatus('');
      toast('Dashboard updated from release ' + tag);
    } catch (error) {
      // Backend failures (timeout, 403, 404, network, parse errors) fall back to
      // the cached/static snapshot. Surface the reason so it is not silent.
      console.error('Backend workbook unavailable, using cached/static snapshot:', error);
      reportError(error, toast);
      setLoadingStatus('');
    } finally {
      refreshBusy = false;
    }
  };

  window.getLatestRelease = getLatestRelease;
})();