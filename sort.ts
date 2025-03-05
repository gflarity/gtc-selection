import { BinaryHeap } from "jsr:@deno-agents/async-binary-heap"
import { Session } from "./lib/sessions.ts"
import { getCmp } from "./comp.ts"

const heap = new BinaryHeap<Session>(getCmp())

// Load up the sessions
const json = await Deno.readFile("./filtered-heaped-sessions.json")
const sessions = JSON.parse(new TextDecoder().decode(json)) as Session[]

// Push all sessions into the heap
for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]
    await heap.push(session)
    console.log(`Pushed session ${i} into the heap`)
}

const topTen: Session[] = []
for (let i = 0; i < 10; i++) {
    const session = await heap.pop()
    if (!session) break
    topTen.push(session)
    console.log(`Popped session ${i} from the heap`)
}

Deno.writeFile(
    "./top-ten-sessions.json",
    new TextEncoder().encode(JSON.stringify(topTen, null, 2))
)
