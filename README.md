# popiadesk-coming-soon

Deploy artifact. Serves popiadesk.co.za via GitHub Pages while the production
host is rebuilt.

Do not edit these files here. The canonical source lives in the private
popiadesk repo under `coming-soon/`; run `npm run interim:build` there, verify
with `npm run interim:verify`, and push the contents of `coming-soon/dist` to
this repo.
