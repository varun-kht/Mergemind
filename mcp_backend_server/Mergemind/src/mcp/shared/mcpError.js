export class McpError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.details = details;
  }
}