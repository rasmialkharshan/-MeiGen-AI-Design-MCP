# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

MeiGen AI Design MCP is an open-source Model Context Protocol (MCP) server that gives AI coding assistants (Claude Code, Cursor, OpenClaw, etc.) visual creative capabilities: gallery search over 1,500+ curated prompts, prompt enhancement, and AI image generation via MeiGen Cloud, local ComfyUI, or any OpenAI-compatible provider.

## Commands

```bash
npm run build       # tsc — compile TypeScript to dist/
npm run dev         # tsx src/index.ts — run without build step
npm run typecheck   # tsc --noEmit — type check only
```

No test or lint scripts are configured. Node ≥18 required.

## Architecture

**Entry point**: `bin/meigen-mcp.js` routes to either the MCP server (`dist/index.js`) or the CLI setup wizard (`dist/cli/init.ts`). The MCP server uses stdio transport from `@modelcontextprotocol/sdk`.

**Configuration** (`src/config.ts`): Loaded from env vars → `~/.config/meigen/config.json` → defaults. Provider priority: MeiGen Cloud > ComfyUI > OpenAI-compatible. Config detection determines which tools are available at runtime.

**Seven MCP tools** (all in `src/tools/`):

| Tool | Cost | Purpose |
|------|------|---------|
| `search-gallery` | free | Full-text search over bundled `data/trending-prompts.json` |
| `get-inspiration` | free | Fetch full prompt + variants for a gallery entry |
| `enhance-prompt` | free | Transform brief ideas into detailed image prompts |
| `list-models` | free | List available models across configured providers |
| `generate-image` | requires credentials | Core generation; handles parallelization & reference images |
| `comfyui-workflow` | free | CRUD for ComfyUI workflow templates in `~/.config/meigen/workflows/` |
| `manage-preferences` | free | Persistent style/model/aspect-ratio preferences |

**Provider layer** (`src/lib/providers/`): `meigen.ts`, `openai.ts`, `comfyui.ts` each implement `ProviderCapabilities`. ComfyUI execution is serialized via `src/lib/semaphore.ts` (1 slot); API calls parallelize up to 4.

**Server instructions**: `src/server.ts` contains 200+ lines of `SERVER_INSTRUCTIONS` that guide the LLM through Phase 0–4 workflows (intent assessment, strategy, generation, error recovery, batch handling). Read this when modifying tool orchestration behavior.

**Reference image handling** (`src/lib/upload.ts`): local files are compressed (max 2MB, 2048px via `sharp`) and uploaded to Cloudflare R2 via presigned URLs; URLs are passed through directly.

**Data**: `data/trending-prompts.json` (~3.1MB, 1,500+ entries) is the offline prompt library. Loaded and indexed by `src/lib/prompt-library.ts`; searched by `src/lib/api-search.ts` (simple string matching).

**Plugin assets** (`plugin/`): Skills, slash commands (`/meigen:gen`, `/meigen:find`, `/meigen:models`, `/meigen:setup`), and sub-agent definitions (gallery-researcher, image-generator, prompt-crafter) for the Claude Code marketplace.

**Hooks** (`hooks/`): Session-start hook validates config; a macOS hook auto-opens generated images.

## Setup Wizard

```bash
npx meigen
# or: node bin/meigen-mcp.js
```

Guides through MCP config initialization for Cursor, VS Code, Windsurf, Roo Code, or Claude Code.
