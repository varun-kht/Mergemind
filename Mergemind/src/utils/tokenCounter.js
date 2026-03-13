// Rough token estimator: ~4 chars per token (GPT/LLaMA standard approximation)
export function estimateTokens(text = "") {
  return Math.ceil((text || "").length / 4);
}

// Groq pricing for llama-3.3-70b-versatile (as of 2025)
// https://groq.com/pricing
const PRICING = {
  inputPerMillion:  0.59, // $0.59 per 1M input tokens
  outputPerMillion: 0.79, // $0.79 per 1M output tokens
};

function calculateCost(inputTokens, outputTokens) {
  const inputCost  = (inputTokens  / 1_000_000) * PRICING.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * PRICING.outputPerMillion;
  const totalCost  = inputCost + outputCost;
  return {
    inputCost:  inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost:  totalCost.toFixed(6),
    formatted:  `$${totalCost.toFixed(6)}`,
  };
}

export function createTokenTracker() {
  const usage = {
    summary: { input: 0, output: 0 },
    reviews: [],
    total:   { input: 0, output: 0 },
  };

  return {
    trackSummary(inputText, outputText) {
      const input  = estimateTokens(inputText);
      const output = estimateTokens(JSON.stringify(outputText));
      usage.summary.input  = input;
      usage.summary.output = output;
      usage.total.input  += input;
      usage.total.output += output;
      const cost = calculateCost(input, output);
      console.log(`  [Tokens] Summary   → input: ${input}, output: ${output} | cost: ${cost.formatted}`);
    },

    trackChunk(index, inputText, outputText) {
      const input  = estimateTokens(inputText);
      const output = estimateTokens(typeof outputText === 'string' ? outputText : JSON.stringify(outputText));
      const cost   = calculateCost(input, output);
      usage.reviews.push({ chunk: index + 1, input, output, cost: cost.formatted });
      usage.total.input  += input;
      usage.total.output += output;
      console.log(`  [Tokens] Chunk ${index + 1}  → input: ${input}, output: ${output} | cost: ${cost.formatted}`);
    },

    getReport() {
      const grand     = usage.total.input + usage.total.output;
      const totalCost = calculateCost(usage.total.input, usage.total.output);
      return {
        summary: {
          ...usage.summary,
          cost: calculateCost(usage.summary.input, usage.summary.output).formatted,
        },
        chunks: usage.reviews,
        total: {
          input:  usage.total.input,
          output: usage.total.output,
          grand,
          cost:   totalCost.formatted,
        },
      };
    },

    formatReport() {
      const r = this.getReport();
      const lines = [
        ``,
        `⚡ Token Usage & Cost Report`,
        `─────────────────────────────────────────────`,
        `📋 Summary Call`,
        `   Input   : ${r.summary.input.toLocaleString()} tokens`,
        `   Output  : ${r.summary.output.toLocaleString()} tokens`,
        `   Cost    : ${r.summary.cost}`,
        ``,
        `🔍 Review Chunks`,
        ...r.chunks.map(
          c => `   Chunk ${c.chunk}: input ${c.input.toLocaleString()} · output ${c.output.toLocaleString()} · ${c.cost}`
        ),
        ``,
        `📊 Totals`,
        `   Total Input   : ${r.total.input.toLocaleString()} tokens`,
        `   Total Output  : ${r.total.output.toLocaleString()} tokens`,
        `   Grand Total   : ${r.total.grand.toLocaleString()} tokens`,
        `   💰 Total Cost : ${r.total.cost}`,
        `─────────────────────────────────────────────`,
        `   Pricing: $${PRICING.inputPerMillion}/1M input · $${PRICING.outputPerMillion}/1M output (Groq llama-3.3-70b)`,
      ];
      return lines.join("\n");
    },
  };
}
