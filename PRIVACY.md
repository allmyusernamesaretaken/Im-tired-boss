# Privacy

**Short version: I'm Tired, Boss collects nothing and sends nothing anywhere except to claude.ai.**

## What the extension accesses

- **claude.ai:** It requests your organization list and your usage limits from claude.ai (`/api/organizations` and `/api/organizations/<id>/usage`), using the login you already have in Firefox. These are the same requests claude.ai makes for its own usage page.
- **The claude.ai page:** It adds the usage bars to the sidebar and its settings entry to claude.ai's settings dialog. It does not read your chats.

## What it stores

Locally in Firefox (`storage.local`), and only there:

- Your settings for the extension
- The latest usage values (percentages, reset times, extra usage amounts) per organization, under a hash of the organization ID instead of the ID itself
- Which places in the sidebar were found (for the diagnostics in the popup)

## What it does not do

- No analytics, telemetry or tracking
- No requests to any server other than claude.ai
- No access to your chats, files or account details beyond the usage values above
- No remote code

Uninstalling the extension removes all stored data.
