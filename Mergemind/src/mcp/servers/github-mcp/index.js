import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load .env from Mergemind root (works when run by Cursor MCP or standalone)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", "..", "..", ".env") });

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getPrDiffTool } from "./tools/getPrDiff.js";
import { getPrMetadataTool } from "./tools/getPrMetadata.js";
import { getPrCommitsTool } from "./tools/getPrCommits.js";
import { listChangedFilesTool } from "./tools/listChangedFiles.js";
import { listPullRequestsTool } from "./tools/listPullRequests.js";
import { postReviewCommentTool } from "./tools/postReviewComment.js";

const server = new Server(
  {
    name: "github-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  getPrDiffTool,
  getPrMetadataTool,
  getPrCommitsTool,
  listChangedFilesTool,
  listPullRequestsTool,
  postReviewCommentTool
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.schema.shape ? {
        type: "object",
        properties: Object.fromEntries(
           Object.entries(t.schema.shape).map(([k, v]) => [k, { type: "string", description: v._def.description }])
        ),
        required: Object.keys(t.schema.shape)
      } : { type: "object", properties: {} } // extremely simplified zod to json schema for this demo
    })),
  };
});

// A slightly better Zod to JSON Schema converter for SDK to work with
function zodToJsonSchema(zodSchema) {
  if (!zodSchema || !zodSchema.shape) return { type: "object", properties: {} };
  const shape = zodSchema.shape;
  const properties = {};
  const required = [];
  
  for (const [key, propSchema] of Object.entries(shape)) {
    let type = "string";
    let isOptional = propSchema.isOptional();
    let def = isOptional ? propSchema._def.innerType._def : propSchema._def;
    
    if (def.typeName === "ZodNumber") type = "number";
    if (def.typeName === "ZodBoolean") type = "boolean";
    
    properties[key] = {
      type,
      description: def.description || propSchema.description || ""
    };
    
    if (!isOptional) {
      required.push(key);
    }
  }
  
  return {
    type: "object",
    properties,
    required
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema)
    })),
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const args = request.params.arguments || {};
  return await tool.handler(args);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("github-mcp server running on stdio");
}

run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});