# Supabase MCP Server Setup

## Overview
The Supabase MCP (Model Context Protocol) server allows Claude to interact directly with your Supabase database and services.

## Configuration Status
✅ MCP configuration file created (`.mcp.json`)
✅ Supabase URL configured: `https://mrkcgfsbdcukufgwvjap.supabase.co`
❌ Service Role Key needed

## Getting Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap/settings/api
2. In the "API Settings" page, look for "Project API keys"
3. Find the "service_role" key (NOT the anon/public key)
4. Copy the service_role key

## Setting Up the Service Role Key

### Option 1: Environment Variable (Recommended for Security)
Create a `.env.mcp` file in your project root:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Then update `.mcp.json` to reference it:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_URL": "https://mrkcgfsbdcukufgwvjap.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

### Option 2: Direct in .mcp.json (Less Secure)
Replace `YOUR_SERVICE_ROLE_KEY_HERE` in `.mcp.json` with your actual service role key.

## Important Security Notes
⚠️ **NEVER commit your service role key to git**
- The service role key bypasses Row Level Security (RLS)
- It has full admin access to your database
- Add `.env.mcp` to your `.gitignore` if using Option 1

## Testing the Connection
After setting up the key, restart Claude Code to load the MCP server. The Supabase MCP server will provide tools for:
- Database queries and mutations
- Storage operations
- Auth management
- Edge function management

## Project Details
- **Project Reference**: mrkcgfsbdcukufgwvjap
- **Project URL**: https://mrkcgfsbdcukufgwvjap.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap