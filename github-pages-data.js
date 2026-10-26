(function () {
  'use strict';

  const config = window.ZONG_DASHBOARD_CONFIG;
  let currentDataVersion = '';
  let refreshBusy = false;
  let lastError = '';

  function reportError(error, toast) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Public demo data refresh failed:', error);
    if (message !== lastError) {
      toast('Demo data refresh failed: ' + message);
      lastError = message;
    }
  }

  async function getDataVersion() {
    const response = await fetch(config.dataUrl, {
      method: 'HEAD',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Demo data endpoint returned ' + response.status + '.');
    }

    const version = response.headers.get('ETag') ||
      response.headers.get('Last-Modified') ||
      response.headers.get('Content-Length');
    if (!version) {
      throw new Error('The demo data endpoint did not return a version header.');
    }
    return version;
  }

  async function readCompressedData(response) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress the demo data file.');
    }
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).json();
  }

  window.refreshSharePointWorkbook = async function (applyDashboardData, toast) {
    if (refreshBusy) {
      return;
    }

    refreshBusy = true;
    try {
      if (!config || !config.dataUrl) {
        throw new Error('Set the demo data URL in dashboard-config.js.');
      }

      const version = await getDataVersion();
      if (version === currentDataVersion) {
        lastError = '';
        return;
      }

      const response = await fetch(config.dataUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Could not download demo data (' + response.status + ').');
      }

      const data = await readCompressedData(response);
      applyDashboardData(data, 'public demo API', false);
      currentDataVersion = version;
      lastError = '';
      toast('Dashboard updated from public demo data');
    } catch (error) {
      reportError(error, toast);
    } finally {
      refreshBusy = false;
    }
  };
})();
