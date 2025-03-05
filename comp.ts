import { completeWithSchema } from "jsr:@deno-agents/utils"
import { Session } from "./lib/sessions.ts"

export function getCmp(): (a: Session, b: Session) => Promise<number> {
    // Initialize a cache to store comparison results
    const cache = new Map<string, number>()
    return async (a: Session, b: Session) => {
        // Generate keys for both comparison orders
        const keyAB = `${a.sessionID}_${b.sessionID}`
        const keyBA = `${b.sessionID}_${a.sessionID}`

        // Check if the result is cached for a vs. b
        if (cache.has(keyAB)) {
            console.log(`Cache hit for ${a.title} vs. ${b.title}`)
            return cache.get(keyAB)!
        }
        // Check if the result is cached for b vs. a and negate it
        else if (cache.has(keyBA)) {
            console.log(`Cache hit for ${b.title} vs. ${a.title}`)
            return -cache.get(keyBA)!
        }
        // If not cached, perform the comparison
        else {
            const schema = {
                $schema: "http://json-schema.org/draft-07/schema#",
                type: "object",
                properties: {
                    result: {
                        type: "integer",
                        enum: [1, -1],
                    },
                },
                required: ["result"],
                additionalProperties: false,
            }

            const systemPrompt =
                "You are an expert at comparing GTC conference sessions given their titles and abstracts."
            const model = "deepseek-ai/DeepSeek-R1"
            const userPrompt =
                `You will analyze Titles & Abstracts of two GTC sessions (A and B) to determine which better emphasizes cost reduction, efficiency improvements, and aligns with the following success criteria:

    Greater Impact/Optimization Focus: More actionable strategies addressing measurable cost reduction and time/resource efficiency in AI/ML workflows, deployments, or applications. Prioritizes metrics/evidence of concrete benefits over superficial buzz.
    Less Self-Promotion: Avoids hyperbole/pricing-focused selling; highlights challenges/successes usable across models/tools/organizations.
    Broader Applicability: Solutions/insights apply broadly (multiple domains or framework-agnostic) vs. niche/hardware-specific optimizations or verticals.
    ⤷ For authenticity: Penalize vague/generic phrases; reward specific frameworks, real-world examples, and caveats acknowledging limits.

    Template for Analysis
    Step-by-Step Instructions:

    Analyze Criteria for Section A - Assign scores ((1-5): Cost/Efficiency Emphasis | Avoidance of Self-Promotion | Accessibility Generality | Supported Claims.

    Analyze Criteria for Section B - Same framework.
    (Compare relative strengths for each criteria).

    Make Final Call. Consider:

    • Does A/B discuss actual financial metrics (e.g., 20%↑ inference speed) rather than ROI hype?
    • Did one omit practical implementation roadblocks? (= possible overselling sign).
    • If A focuses on custom ASIC chip design & B improves PyTorch pipeline design → B has wider ML impact.

    VERDICT Format → {-1 if A>B, 1 if B>=A}: {{Return only "-1" or "1" without explanation.}}

    Sessions Provided: ` +
                "Title for paper a: ```" +
                a.title +
                "``` " +
                "Abstract for paper a: ```" +
                a.abstract +
                "``` " +
                "Title for paper b: ```" +
                b.title +
                "``` " +
                "Abstract for paper b: ```" +
                b.abstract +
                "```"

            console.log(`Comparing ${a.title} with ${b.title}`)
            const [content, reasoning] = await completeWithSchema(
                Deno.env.get("CENTML_API_KEY")!,
                "https://api.centml.com/openai/v1",
                schema,
                systemPrompt,
                userPrompt,
                model
            )

            console.log("reasoning", reasoning)
            console.log("content", content)
            const obj = JSON.parse(content)
            const result = obj.result

            // Cache the result for a vs. b
            cache.set(keyAB, result)
            return result
        }
    }
}
