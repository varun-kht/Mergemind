import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

/**
 * Creates and returns a stdio transport for the Qdrant MCP server.
 * Same pattern as github-mcp — spawned as a child process by the MCP client.
 */
export function createTransport() {
  return new StdioServerTransport()
}