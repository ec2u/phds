---
title: Work Notes
summary: Known issues, workarounds, and investigation notes
description: |
  Tracks known platform issues affecting development, including research findings,
  workarounds, and references to upstream reports.
---

# Confluence Keyboard Shortcuts Intercept Input Events

**Status**: open
**Affects**: title filter in issues sidebar (`src/client/views/lenses/issues.tsx`)

## Problem

The title filter in the issues sidebar should be a free-text input, but Confluence Cloud registers single-character
global keyboard shortcuts in page view mode (for instance, `e` to edit the page, `c` to create a new page). When the
user types in a text field inside the macro, these shortcuts fire instead of inserting the character.

## Root Cause

The macro is configured with `render: native` (UI Kit) in `manifest.yml`. Native rendering places the macro's
components directly in the Confluence DOM, with no iframe isolation. Keyboard events from the macro's input elements
bubble up to Confluence's global shortcut handlers.

UI Kit does not expose the underlying DOM, so standard mitigations (`stopPropagation()`, `preventDefault()`) cannot be
applied to the raw input element.

## Current Workaround

The title filter uses a `<Select isMulti>` component with predefined options derived from the issues catalogue. This
avoids free-text typing entirely, sidestepping the shortcut interception.

## Possible Approaches

- **Keep `<Select>`** — current approach; functional but limits input to predefined values
- **Switch to Custom UI (`render: default`)** — iframe isolation prevents event bubbling to Confluence, but sacrifices
  native rendering performance and requires bundling custom CSS and components
- **Test `<Textfield>` from `@forge/react`** — Atlassian's own component may handle focus and shortcut suppression
  internally; however, a related cursor-skipping bug ([ECO-1041](https://jira.atlassian.com/browse/ECO-1041)) suggests
  text input in UI Kit still has rough edges
- **Move filter to macro configuration panel** — the configuration modal typically suppresses Confluence shortcuts, but
  this changes the UX to a configure-then-view pattern

## References

- [Confluence keyboard shortcuts](https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/)
- [Forge UI Kit overview](https://developer.atlassian.com/platform/forge/ui-kit/) — confirms no DOM access
- [Forge keyboard shortcut priority](https://developer.atlassian.com/platform/forge/manifest-reference/keyboard-shortcuts/) — Confluence shortcuts take precedence
- [Forge Custom UI iframe](https://developer.atlassian.com/platform/forge/custom-ui/iframe/) — sandbox attributes
- [TextArea cursor-skipping bug (ECO-1041)](https://community.developer.atlassian.com/t/cursor-skips-characters-when-typing-quickly-in-a-textarea/94756)
