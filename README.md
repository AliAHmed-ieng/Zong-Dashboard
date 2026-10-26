# Zong Network & Power Dashboard — GitHub Pages demo

The dashboard loads Backend.xlsm from this public GitHub Pages site. A GitHub Actions workflow copies the workbook from the latest published GitHub Release to Pages. The browser checks for workbook updates every **3 seconds**. It does not read or synchronize SharePoint directly.

## Important: public data

The GitHub repository, Release workbook, and Pages copy are public and require no login. Anyone can download the workbook. Publish randomized demo data only; never publish confidential or production information.

## Dashboard

https://aliahmed-ieng.github.io/Zong-Dashboard/Zong_Network_Power_Dashboard_Mapped.html

## Update the backend workbook

1. Get the current `[Backend.xlsm` file from the [GitHub Releases page](https://github.com/AliAHmed-ieng/Zong-Dashboard/releases). You can also start with your working copy in Excel.
2. Edit it in desktop Microsoft Excel. Keep the file as an Excel macro-enabled workbook (`[.xlsm`); do not rename it to .xlsx or CSV.
3. Preserve the existing worksheet names, header row, and column names, especially the site sheets (`[Korangi`, `[Dalmia`, `[Hyderabad`, `[Quetta`), `[Fuel Status`, and fuel detail sheets. Add/update rows under the existing headers. Keep date, month, and year values valid. The dashboard maps these names and columns.
4. In Excel, recalculate if needed and save the workbook. The dashboard reads the saved cell values; it does not run Excel VBA macros in the browser.
5. Open [Create a new GitHub Release](https://github.com/AliAHmed-ieng/Zong-Dashboard/releases/new). Create a **new unique tag** each time, for example `[backend-v1.0.1`, then `[backend-v1.0.2`. Do not reuse the old tag.
6. Attach the edited file, named exactly `[Backend.xlsm`. Publish the release (not as a draft). The release event starts the Pages workflow automatically.
7. Check the [Actions page](https://github.com/AliAHmed-ieng/Zong-Dashboard/actions). Wait for the newest `[Deploy static content to Pages` run to finish successfully.
8. Once deployment finishes, an open dashboard checks every 3 seconds and downloads the new workbook. Because the workbook is about 45 MB, loading can take some time. If it does not update, hard-refresh with Ctrl+Shift+R after the workflow succeeds.

SharePoint-only edits do **not** trigger this process. To publish a SharePoint change, download the updated workbook and complete steps 5–8. This setup has no login and is for demo/testing only.

## If the dashboard remains on Loading data

The dashboard now loads its Excel parser from this Pages site and displays a load error in place of the spinner if fetching or parsing fails. Hard-refresh once, allow time for the workbook download, and check that the latest Pages workflow succeeded. If it still fails, note the error shown in the dashboard and check the Actions run.
