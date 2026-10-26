# Zong Network & Power Dashboard — GitHub Pages demo

The dashboard is public and reads the workbook attached to the latest published GitHub Release. GitHub Actions deploys each release's workbook to a tag-specific URL so the Pages CDN cannot keep serving an older workbook at the same URL. The dashboard's refresh loop remains **3 seconds**; it checks the public Releases API for a new tag about every **70 seconds** to stay within GitHub's unauthenticated API limit. It does not read or synchronize SharePoint directly.

## Important: public data

The GitHub repository, Release workbook, and Pages copy are public and require no login. Anyone can download the workbook. Publish randomized demo data only; never publish confidential or production information.

## Dashboard

https://aliahmed-ieng.github.io/Zong-Dashboard/Zong_Network_Power_Dashboard_Mapped.html

## Update the backend workbook

1. Get the current Backend.xlsm file from the GitHub Releases page: https://github.com/AliAHmed-ieng/Zong-Dashboard/releases. You can also start with your working copy in Excel.
2. Edit it in desktop Microsoft Excel. Keep the file as an Excel macro-enabled workbook (.xlsm); do not rename it to .xlsx or CSV.
3. Preserve the existing worksheet names, header row, and column names, especially the site sheets (Korangi, Dalmia, Hyderabad, Quetta), Fuel Status, and fuel detail sheets. Add/update rows under the existing headers. Keep date, month, and year values valid. The dashboard maps these names and columns.
4. In Excel, recalculate if needed and save the workbook. The dashboard reads the saved cell values; it does not run Excel VBA macros in the browser.
5. Open Create a new GitHub Release: https://github.com/AliAHmed-ieng/Zong-Dashboard/releases/new. Create a new unique tag each time, for example backend-v1.0.1, then backend-v1.0.2. Do not reuse the old tag.
6. Attach the edited file, named exactly Backend.xlsm, then publish the release as a normal published release (not a draft or prerelease).
7. Check the Actions page: https://github.com/AliAHmed-ieng/Zong-Dashboard/actions. Wait for the newest Deploy static content to Pages run to finish successfully. The workflow downloads that release's asset and publishes it under a unique path.
8. An open dashboard discovers the latest release within about 70 seconds after the release is visible, then downloads and parses the workbook. The file is about 45 MB, so the data load can take additional time. Keep the dashboard tab open; the existing 3-second refresh loop applies updates after they are discovered.

SharePoint-only edits do not trigger this process. To publish a SharePoint change, download the updated workbook and complete steps 5–8. This setup has no login and is for demo/testing only.

## If the dashboard does not update

Confirm the new release includes the edited Backend.xlsm, the deployment workflow succeeded, and the release is not a draft or prerelease. Then hard-refresh the dashboard once with Ctrl+Shift+R so it loads the updated release-aware refresh script. If an error appears, check the Actions run and the dashboard's error message.
