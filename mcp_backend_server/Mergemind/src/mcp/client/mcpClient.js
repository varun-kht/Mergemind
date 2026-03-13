import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { toolServerMap } from "./toolRegistry.js";
import path from "path";
import { fileURLToPath } from "url";
import { McpError } from "../shared/mcpError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store active clients
const clients = {};

export async function initMcpClients() {
  const servers = {
    "github-mcp": path.join(__dirname, "../servers/github-mcp/index.js"),
    "qdrant-mcp": path.join(__dirname, "../servers/qdrant-mcp/index.js")
  };

  for (const [serverName, scriptPath] of Object.entries(servers)) {
    console.log(`[MCP Client] Initializing to ${serverName}...`);
    
    const transport = new StdioClientTransport({
      command: "node",
      args: [scriptPath],
    });

    const client = new Client(
      {
        name: "mergemind-orchestrator",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    clients[serverName] = client;
    console.log(`[MCP Client] Connected to ${serverName}`);
  }
}

export async function callMcpTool(toolName, args) {
  const serverName = toolServerMap[toolName];
  if (!serverName) {
    throw new McpError(`Unknown tool: ${toolName}. Not registered in toolServerMap.`, 'UNKNOWN_TOOL');
  }

  const client = clients[serverName];
  if (!client) {
    throw new McpError(`Server ${serverName} is not connected.`, 'SERVER_NOT_CONNECTED');
  }

  try {
    const response = await client.callTool({
      name: toolName,
      arguments: args
    });

    if (response.isError) {
      throw new McpError(`Tool ${toolName} failed execution`, 'TOOL_ERROR', response.content);
    }

    // Just return the raw response, the orchestrator scripts parse it manually
    return response;

  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(`Failed to call tool ${toolName}: ${error.message}`, 'RPC_ERROR');
  }
}