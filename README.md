# Zong Network & Power Dashboard — public GitHub Pages demo

This no-login demo serves the HTML and a compressed data snapshot from GitHub Pages. The generated `demo-data.json.gz` was derived locally from the randomized `Backend.xlsm`; the workbook itself is not included. GitHub Pages is public, so anyone can download this demo dataset.

The browser checks the static data endpoint every **3 seconds**, preserving the dashboard's existing polling interval. When the published file changes, it downloads and applies the new snapshot.

## Publish

Upload these files to the root of the public `AliAHmed-ieng/Zong-Dashboard` repository:

- `Zong_Network_Power_Dashboard_Mapped.html`
- `dashboard-config.js`
- `github-pages-data.js`
- `demo-data.json.gz`
- `README.md`
- `.gitignore`

Do **not** upload `Backend.xlsm`. Enable GitHub Pages for the `main` branch and `/ (root)` in the repository's **Settings → Pages**. The dashboard will be available at:

`https://aliahmed-ieng.github.io/Zong-Dashboard/Zong_Network_Power_Dashboard_Mapped.html`

## Update demo data

`demo-data.json.gz` is a static, publicly downloadable snapshot, **not a live connection to SharePoint**. When the workbook changes, regenerate the JSON snapshot from an approved demo workbook and replace the published file. A public page cannot anonymously read a private SharePoint workbook through Graph; later, add user authentication or a secured server-side API if you need live workbook updates without publishing the dataset publicly.
