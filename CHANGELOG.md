# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-16

First release.

### Added

- Usage bars in the claude.ai sidebar for the 5-hour window and weekly limit, plus optional bars for Opus, Sonnet, OAuth apps, Cowork and extra usage when your plan has them
- Positions below the Claude logo and above your profile, styled with claude.ai's own font and colors in light and dark mode, with a hover highlight per bar
- Text above each bar: name, percent and reset time or time left, following your system's time format or 12h/24h
- Optional color change above two usage thresholds
- Settings inside claude.ai's settings dialog ("I'm Tired, Boss" below "Usage"), reachable via right-click on the bars, the toolbar popup or `about:addons`
- Expert mode with templates for all bars and per-bar overrides: `{name}`, `{pct}`, `{reset}` (automatic, 12h/24h or Unicode LDML patterns), `{left}`, `{spent}`, `{none}`, with a help page and live examples
- Toolbar popup with a preview of the bars, a status line (up to date, stale, logged out, endpoint changed, network), "Update now", a settings link and diagnostics
- Toolbar badge with the 5-hour usage
- Usage is fetched only from visible claude.ai tabs and at most every 5 minutes, with validation of the response and backoff on errors; data is stored locally per organization under a hashed ID
- UI strings in `_locales` for future translations

[Unreleased]: https://github.com/allmyusernamesaretaken/Im-tired-boss/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/allmyusernamesaretaken/Im-tired-boss/releases/tag/v1.0.0
