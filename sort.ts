import { BinaryHeap } from "jsr:@deno-agents/async-binary-heap"
import { Session } from "./lib/sessions.ts"
import { completeWithSchema } from "jsr:@deno-agents/utils"

const heap = new BinaryHeap<Session>(async (a: Session, b: Session) => {
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
        "Compare these two GTC session abstracts." +
        "Give session a's abstract, and session b's abstract," +
        "if a is the session that has a greater emphasis on reducing costs" +
        "and increasing effeciency of machine learning models, return -1." +
        "If b is the session that has a greater emphasis on reducing costs" +
        "and increasing effeciency of machine learning models, return 1." +
        "Abstract for paper a: ```" +
        a.abstract +
        "``` " +
        "Abstract for paper b: ```" +
        b.abstract +
        "```"
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
    return obj.result
})

// load up the sessions
const json = await Deno.readFile("./filtered-sessions.json")
let sessions = JSON.parse(new TextDecoder().decode(json)) as Session[]

for (const session of sessions) {
    console.log(session.title)
    console.log(session.abstract)
    console.log("")
}
