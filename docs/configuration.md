# Configuration

## src/config.js

Single source of truth for environment and table constants:

```js
export const ORG_URL = 'https://org9adc8d39.api.crm8.dynamics.com'

export const SOLUTION_TABLES = [
  { key: 'cr045_creditbureaus',       label: 'Credit Bureau' },
  { key: 'cr045_submissionapprovals', label: 'Submission Approval' },
  { key: 'cr045_submissionfiles',     label: 'Submission File' },
  { key: 'cr045_submissionrequests',  label: 'Submission Request' },
]
```

---

## power.config.json

| Key | Value |
|---|---|
| App ID | `7e96e401-bd0c-4dd1-88de-79b9c9abc12f` |
| App display name | `SubmissionsHub` |
| Environment ID | `24636fb5-c1ec-ee3b-a1d8-f54245774edd` |
| Connection ID | `0104b734-9714-4238-beb9-74102cbfc06a` |
| Connector | `shared_commondataserviceforapps` (Microsoft Dataverse) |
| Build path | `./dist` |

---

## User / Branding

| Field | Value |
|---|---|
| App name (UI) | BureauTrack |
| Subtitle | Credit Bureau Submission Tracker |
| Solution name | RegulatorySubmissionsHub |
| Publisher prefix | `cr045_` |
| User name | Ram Prasad |
| Email | ramprasad@openterrace.in |
| Company | Open Terrace |
| Role | Data Quality Manager |
