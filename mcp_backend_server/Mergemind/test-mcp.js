// test-mcp.js
import 'dotenv/config'
import { callTool, closeAll } from './src/mcp/client/mcpClient.js'

// Test GitHub MCP
const diff = await callTool('get_pr_diff', {
  repo: 'YOUR_GITHUB_USERNAME/YOUR_REPO',
  prNumber: 1  // use a real open PR number
})
console.log('Diff length:', diff.length)

// Test Qdrant MCP
const stored = await callTool('store_chunk', {
  repo: 'test/repo',
  prNumber: 1,
  chunkIndex: 0,
  text: 'console.log("hello world")'
})
console.log('Store result:', stored)

const similar = await callTool('retrieve_similar', {
  text: 'console.log("hello")',
  topK: 3
})
console.log('Similar chunks:', similar)

await closeAll()