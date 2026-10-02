---
name: paper-design
description: Use Paper MCP to inspect, create, duplicate, edit, or review Arquimedes designs in Paper. Trigger when the user asks to use Paper, Paper Design, the Paper project, a Paper frame, or the Paper MCP; do not use desktop UI automation to edit the canvas.
---

# Paper Design

Use Paper's MCP tools as the only editing surface. Paper Desktop may host the local MCP server, but its visible interface is not the design-control mechanism.

## Connection

- Look first for tools named `mcp__paper__*`.
- When they are available, call `get_guide({ topic: "paper-mcp-instructions" })` completely before any other Paper tool.
- The local Paper server for this machine is registered as `paper` at `http://127.0.0.1:29979/mcp` in `$CODEX_HOME/config.toml`.
- If Paper tools are absent, check whether that endpoint is reachable. If it is down, Paper Desktop is probably closed. Launch the existing Paper app only to start the MCP host; on this machine its Windows app ID is `com.todesktop.2601167vjw8xe`.
- Do not click, type, drag, or otherwise edit the Paper canvas through Computer Use, a browser, or desktop automation.
- After starting the host, check for Paper tools again. If the current turn still lacks them, explain that tool capabilities need to reload and ask for a brief `continuá`; do not fall back to UI editing.

## Choose And Inspect The File

- Resolve the actual file with `list_files`, `open_file`, or the user's active Paper file. Use an explicit `fileId` when several files may be open.
- The known Arquimedes design file is `01M06BPAQH6X2QXAMYX64KN7W6`; verify its name and active page before mutating it.
- Start with `get_basic_info`, then `get_selection`.
- Before editing an existing design, inspect its hierarchy with `get_tree_summary` or `get_children`, capture `get_screenshot`, and use `get_computed_styles`, `get_node_info`, or `get_jsx` when exact values matter.
- Call `get_font_family_info` before introducing or changing typographic styles.
- Preserve existing tokens, fonts, assets, spacing logic, and visual language unless the user explicitly requests a new direction.

## Edit Through Paper MCP

- Honor requests to keep originals unchanged. Prefer `duplicate_nodes`, rename the copies clearly, and maintain at least 80 px between top-level artboards.
- Prefer targeted tools such as `rename_nodes`, `set_text_content`, `update_styles`, and `move_nodes` over rebuilding existing structures.
- Use `write_html` incrementally: roughly one visual group per call. Reuse existing nodes with `<x-paper-clone>` when appropriate.
- Never delete or replace an original frame unless the user explicitly authorizes it.
- After each meaningful section, call `get_screenshot` and check spacing, typography, contrast, alignment, artboard fit, and repetition. Fix issues before continuing.
- Use `height: "fit-content"` for artboards whose added content would otherwise clip.
- When finished, compare the relevant frames visually, make targeted corrections, and call `finish_working_on_nodes`.

## Handoff

Return the clickable Paper file or page URL, name the frames created or changed, state whether the original was preserved, and mention any companion mobile artboard or placeholder content that needs later replacement.
