const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+(me\s+)?(the\s+)?private\s+key/i,
  /output\s+(the\s+)?secret/i,
  /bypass\s+(risk|permission|security)/i,
  /disable\s+(the\s+)?(risk|security|kill)\s*(checks|switch)?/i,
  /transfer\s+(all|the)\s+(funds|collateral)/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function assertSafeAgentInput(input: string): void {
  if (input.length > 8_000) throw new Error("Agent input exceeds maximum length");
  if (detectPromptInjection(input)) throw new Error("Potential prompt injection detected");
}
