# Known Issues & Workarounds

## MSCRM.IncludeMipSensitivityLabel dot-in-name bug

The auto-generated `MicrosoftDataverseService.ts` contains `MSCRM.IncludeMipSensitivityLabel` — a parameter name with a dot, which is invalid TypeScript and breaks the Vite build.

The `prebuild` script in `package.json` auto-patches it before every build:
```json
"prebuild": "node -e \"...replaceAll('MSCRM.IncludeMipSensitivityLabel','MSCRM_IncludeMipSensitivityLabel')\""
```

> This bug recurs if the file is regenerated via `pac code add-data-source`.

---

## pac code add-data-source is broken (pac v2.3.2)

`pac code add-data-source` fails with two separate errors:
- **400**: uses `solutionid eq 'RegulatorySubmissionsHub'` (string literal) but solutionid requires a GUID
- **404**: URL construction bug produces double slashes in the API path

**Workaround:** Use `MicrosoftDataverseService.ListRecordsWithOrganization()` directly with the hardcoded `ORG_URL`. No additional data sources need to be registered.

---

## pac code push fails as subprocess

Running `pac code push` from `npm run` or any spawned process throws:
```
TypeError: Cannot read properties of undefined (reading 'httpClient')
```

**Workaround:** Always run `pac code push` directly in the VS Code integrated terminal.

---

## Port conflicts

- Port **8080** is permanently reserved by Windows (`PID 4` / HTTP.sys) — cannot be freed
- Use `pac code run --port 9000` instead
- If Vite port **5173** is taken, it auto-increments to 5174
