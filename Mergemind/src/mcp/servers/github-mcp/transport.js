import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

/**
 * Creates and returns a stdio transport for the GitHub MCP server.
 * Stdio means the client spawns this server as a child process and
 * communicates over stdin/stdout — no port, no HTTP needed.
 */
export function createTransport() {
  return new StdioServerTransport()
}