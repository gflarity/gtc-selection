import { BinaryHeap } from "jsr:@deno-agents/async-binary-heap"
import { Session } from "./lib/sessions.ts"
import OpenAI from "jsr:@openai/openai" // OpenAI client for CentML serverless API

/**
 * Performs a completion using the provided schema, system prompt, and user prompt.
 * The schema instruction is automatically appended to the system prompt.
 * @param schema - The JSON schema object that the response should adhere to.
 * @param systemPrompt - The base system prompt (e.g., "You are a helpful AI assistant.").
 * @param userPrompt - The user prompt to send to the model.
 * @param model - The model to use for the completion (default: "meta-llama/Llama-3.3-70B-Instruct").
 * @returns A promise that resolves to the parsed JSON response object.
 */
async function completeWithSchema(
    schema: Record<string, unknown>,
    systemPrompt: string,
    userPrompt: string,
    model: string = "meta-llama/Llama-3.3-70B-Instruct"
): Promise<[string, string | undefined]> {
    const client = new OpenAI({
        apiKey: Deno.env.get("CENTML_API_KEY"),
        baseURL: "https://api.centml.com/openai/v1",
    })

    const schemaStr = JSON.stringify(schema)
    const systemMessage = `${systemPrompt} Here's the json schema you need to adhere to: <schema>${schemaStr}</schema>`

    const response = await client.chat.completions.create({
        messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt },
        ],
        model: model,
        stream: false,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "response",
                schema: schema,
                strict: true,
            },
        },
    })

    const content = response.choices[0].message.content
    if (!content) {
        throw new Error("Failed to generate a response.")
    }
    const reasoning =
        response.choices[0]?.message.reasoning_content || undefined
    return [content, reasoning]
}

async function asyncFilter<T>(
    arr: T[],
    predicate: (item: T) => Promise<boolean>,
    concurrency: number = 1
): Promise<T[]> {
    let index = 0
    const results: boolean[] = new Array(arr.length)

    // Worker function that processes one item at a time.
    async function worker(): Promise<void> {
        while (index < arr.length) {
            const currentIndex = index
            index++
            let attempts = 0
            while (attempts < 2) {
                try {
                    results[currentIndex] = await predicate(arr[currentIndex])
                    break
                } catch (error) {
                    console.error(error)
                    console.log("Retrying item", currentIndex)
                    attempts++
                }
            }
            try {
                results[currentIndex] = await predicate(arr[currentIndex])
            } catch (error) {
                console.error(error)
                console.log("Retrying item", currentIndex)
            }
        }
    }
    // Start the specified number of workers.
    const workers = Array.from({ length: concurrency }, () => worker())
    await Promise.all(workers)

    // Filter the original array using the results.
    return arr.filter((_item, idx) => results[idx])
}

// load up the sessions
const json = await Deno.readFile("./filtered-sessions.json")
let sessions = JSON.parse(new TextDecoder().decode(json)) as Session[]

// filter out non-english sessions, you have to go by the abstract looking for non-english characters
// as the langauge field is not always set to en. There might be false positives, but it'll have to do.bl
sessions = sessions.filter((session) => {
    return /[^\x00-\x7F]/.test(session.abstract) === false
})

sessions = await asyncFilter(
    sessions,
    async (session) => {
        const schema = {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                result: {
                    type: "boolean",
                },
            },
            required: ["result"],
            additionalProperties: false,
        }
        const systemPrompt =
            "You are an expert at analyzing GTC sessions and making recommendations."
//        const userPrompt = `Identify GTC sessions where the primary focus, as indicated by the title and abstract, is on methods, techniques, or technologies for reducing costs and/or improving efficiency in the training or inferencing of machine learning or AI models. The sessions should be technically oriented and provide substantial content, such as detailed descriptions of algorithms, hardware optimizations, software frameworks, or empirical results related to AI model efficiency. Strictly exclude sessions that are primarily advertisements or self-promotional, such as those that focus on promoting a company, product, or service without offering concrete technical insights. Look for keywords like 'model optimization,' 'efficient training,' 'inference acceleration,' 'cost-effective AI,' 'scalable AI solutions,' and similar terms. Favor sessions that discuss specific technical approaches, challenges, or solutions, and those that include demonstrations, code examples, or case studies. Avoid sessions that use vague, high-level, or overly promotional language without substantive technical details. Here's the title: \`\`\` ${session.title} \`\`\`, and here's the abstract: \`\`\` ${session.abstract} \`\`\``
const userPrompt = `Act as an expert AI/ML conference session evaluator. Analyze the title and abstract of each GTC session below. Select only sessions that meet ALL of these criteria:

Core Focus: Explicitly addresses technical methods for:

Reducing computational costs (e.g., energy, hardware, cloud expenses)
Improving efficiency (e.g., faster training, optimized inference, reduced latency, smaller models)
Techniques like quantization, pruning, sparsity, distillation, parallelization, or novel architectures.
Technical Depth:

Mentions frameworks/libraries (e.g., TensorFlow, PyTorch, CUDA) or tools (e.g., Triton, TensorRT).
Describes algorithms, workflows, or measurable results (e.g., "40% fewer FLOPs," "2x speedup on A100").
Avoids vague claims (e.g., "revolutionary," "industry-leading") without technical justification.
Exclusion Rules: Immediately reject sessions that:

Focus on product demos, company announcements, or partnerships without technical detail.
Use excessive marketing language (e.g., "transform your business," "exclusive solution").
Lack concrete methodologies (e.g., only high-level use cases, no benchmarks).

Example of a session that would be included:
Title: "Dynamic Sparsity for Efficient Transformer Training"
Abstract: "We present a PyTorch-based method to dynamically prune attention heads during training, reducing memory usage by 35% on GPT-3-scale models without accuracy loss."
→ Rationale: Includes technical methodology ("dynamic pruning"), framework ("PyTorch"), and measurable results ("35% memory reduction").

Example of a session that would be excluded:
Title: "Accelerate AI with XYZ Corporation’s Cloud Platform"
Abstract: "Discover how our industry-leading platform empowers teams to deploy models faster and cut costs!"
→ Rationale: Promotional language ("industry-leading," "empowers"), no technical details.

Here's the title: \`\`\` ${session.title} \`\`\`, and here's the abstract: \`\`\` ${session.abstract} \`\`\`
`
const model = "deepseek-ai/DeepSeek-R1"
        const [content, reasoning] = await completeWithSchema(
            schema,
            systemPrompt,
            userPrompt,
            model
        )
        console.log("abstract", session.abstract)
        console.log("filter reasoning", reasoning)
        console.log("filter content", content)
        const obj = JSON.parse(content)
        return obj.result
    },
    1
)

await Deno.writeFile(
    "./filtered-sessions-second-pass-with-DSR1-prompt.json",
    new TextEncoder().encode(JSON.stringify(sessions, null, 2))
)
