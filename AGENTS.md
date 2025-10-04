# AGENTS

## General repository guidance
- When updating any playlist source (such as files under `playlists/`), always run `npm run generate:playlist` before committing so that the generated HTML/JSON artifacts in `docs/` and the iOS bundle stay in sync.
- If you only adjust already generated assets and do not need to reparse the playlist, run `npm run sync:webapp` to refresh the published web/app bundle instead of regenerating from source.
- Prefer Spanish for documentation comments intended for end users; code comments can remain in English.
- Follow the existing formatting/style of surrounding files when editing code or configuration.

## PR message reminder
- Summaries should mention any playlist regeneration or sync commands executed as part of the change.
