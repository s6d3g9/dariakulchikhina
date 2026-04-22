# MCP Servers Configuration

Two MCP servers are available: **postgres** (SQL access) and **github** (GitHub API).

## PostgreSQL MCP Server

### Environment: `MCP_POSTGRES_DSN`

Connection string to `daria_admin_refactor` on `localhost:5433`.

**Setup:**
```bash
export MCP_POSTGRES_DSN="postgresql://postgres_readonly:password@localhost:5433/daria_admin_refactor"
```

Add to `.bashrc`/`.zshrc`:
```bash
echo 'export MCP_POSTGRES_DSN="postgresql://postgres_readonly:password@localhost:5433/daria_admin_refactor"' >> ~/.bashrc
source ~/.bashrc
```

Verify:
```bash
psql "$MCP_POSTGRES_DSN" -c "SELECT version();"
```

**Notes:**
- Use read-only role to prevent accidental schema changes
- Database runs on `localhost:5433`
- Contact team for read-only credentials if needed

## GitHub MCP Server

### Environment: `GITHUB_PERSONAL_ACCESS_TOKEN`

Reuse your existing `gh` CLI token.

**Setup:**
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="$(gh auth token)"
```

Add to `.bashrc`/`.zshrc`:
```bash
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="$(gh auth token)"' >> ~/.bashrc
source ~/.bashrc
```

Verify:
```bash
gh auth status
```

**Token scopes required:**
- `repo` — repository access
- `read:org` — organization information

## Troubleshooting

**PostgreSQL fails:** Verify `localhost:5433` is reachable and credentials are correct.

**GitHub token invalid:** Run `gh auth refresh` and `gh auth status --show-token`.

## Disabling Servers

Edit `.claude/settings.json` to remove from `enabledMcpjsonServers` array, or delete entries from `.mcp.json`.
