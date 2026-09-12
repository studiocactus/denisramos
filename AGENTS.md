<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Releases and regression prevention

Before publishing, review the complete working-tree diff and untracked files, including dependencies and database migrations of the requested changes. Do not assume an existing local correction is already committed or deployed. Follow `docs/releases.md`: validate the exact release commit in an isolated checkout, run `npm run verify`, confirm required migrations, and verify the deployed admin. Preserve unrelated work and explicitly record anything excluded from the release.
