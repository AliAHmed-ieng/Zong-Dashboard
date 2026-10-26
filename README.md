# Zong Network & Power Dashboard — GitHub Pages demo

The public dashboard loads Backend.xlsm from the same GitHub Pages origin. A GitHub Actions workflow downloads the workbook asset from the latest published GitHub Release and deploys it with the dashboard. The browser checks for workbook updates every **3 seconds**, preserving the existing refresh interval.

## Public data warning

This repository and its GitHub Pages site are public. The workbook is also a public Release asset, and the Pages copy is downloadable by anyone. Use only randomized demo data; do not publish confidential or production data.

## Dashboard

https://aliahmed-ieng.github.io/Zong-Dashboard/Zong_Network_Power_Dashboard_Mapped.html

## Update the workbook

1. Publish a new GitHub Release containing the updated workbook named exactly Backend.xlsm.
2. The release publication triggers the Pages deployment. A push to main also downloads and deploys the latest published workbook.
3. After deployment completes, the open dashboard detects the new workbook on its next 3-second check.

Changes made only to the SharePoint workbook are **not** mirrored automatically. Upload the updated workbook as a new GitHub Release asset to publish it. This demo has no login; do not use it for private or official backend data.
