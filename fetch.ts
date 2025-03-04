import { Session } from "./lib/sessions.ts";
// This script fetches all the sessions from the NVIDIA GTC 2025 event and saves them to a JSON file.

const url = 'https://events.rainfocus.com/api/search';
const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'origin': 'https://www.nvidia.com',
  'priority': 'u=1, i',
  'referer': 'https://www.nvidia.com/',
  'rfapiprofileid': 'kPEXqZyAH2yKiQIBjup0YsyR0slBWDne',
  'rfwidgetid': 'DrwI9RRokZ85dwAXIgogWYLFShMaC93k'
};


async function getFirst25(): Promise<Session[]> { 
    const params = new URLSearchParams();
    params.append("type", "session");
    params.append("browserTimezone", "America/Toronto");
    params.append("catalogDisplay", "list");

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: params
    });

    const json = await response.text();
    const obj = JSON.parse(json);

    const sessions = obj.sectionList[0].items;
    return sessions
}

async function getNext25(from: number): Promise<Session[]> {
    const params = new URLSearchParams();
    params.append("type", "session");
    params.append("browserTimezone", "America/Toronto");
    params.append("catalogDisplay", "list");
    params.append("from", `${from}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: params
    });

    const json = await response.text();
    const obj = JSON.parse(json);

    const sessions = obj.items;
    return sessions
}

const sessions = await getFirst25()
while (true) {
    const moreSessions = await getNext25(sessions.length);
    if (moreSessions.length === 0) {
        break;
    }
    sessions.push(...moreSessions);
    console.log(sessions.length)
}

await Deno.writeFile("./sessions.json", new TextEncoder().encode(JSON.stringify(sessions, null, 2)));