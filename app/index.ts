import type { Serve, ServerWebSocket } from "bun";
//import { create, type Font } from "fontkit";
import cachedTabsPage from "./assets/tabs.html" with { type: "text" };
import _cachedButton from "./assets/button.svg" with { type: "text" };

const SPACEMONO = Bun.file("./assets/SpaceMono-Regular.ttf")
const SPACEMONO_SBST = Bun.file("./assets/SpaceMono-Regular-subset.woff2")
const cachedButton = _cachedButton.replaceAll(
    "$fontData",
    Buffer.from(
        await SPACEMONO_SBST.arrayBuffer()
    ).toString("base64")
)
/*const SPACEMONO_FK = create(Buffer.from(await SPACEMONO.arrayBuffer())) as Font*/
if (!process.env.DEVICES)
    throw new Error("DEVICES not specified")

const devices = Object.fromEntries(process.env.DEVICES.split(",").map(
    e => 
        Object.entries(Object.groupBy(
            e.split(":"),
            (_,i) => i==0?0:1
        ))  //@ts-ignore booooo
            .sort(([a],[b]) => a-b)
            .map(e => e[1])
            .map(b => b.join(":"))
)) as Record<string, string>

type Device = keyof typeof devices

type DeviceStatus = {
    allWindows: number,
    allTabs: number,
    online: boolean
}

export type DeviceTabkeeper = {
    [x in Device]: DeviceStatus
}

let tabInfo = Object.fromEntries(
    Object.keys(devices).map((device) => [device, {allWindows: 0, allTabs: 0, online: false}])
) as DeviceTabkeeper

let listening: ServerWebSocket<Device>[] = []

function updateListeners() {
    listening.forEach(v => v.send(JSON.stringify(tabInfo)))
}

function updateTabInfo(device: Device, data: any) {
    if (data) {
        // Horrible
        Object.assign(tabInfo[device],{
            allTabs: parseInt(data.allTabs, 10),
            allWindows: parseInt(data.allWindows, 10)
        })
        updateListeners()
    }
}

const server = Bun.serve({
    async fetch(req: Request) {
    
        const url = new URL(req.url)
        let res: Response

        switch(url.pathname.replace(/\/+$/,"")) {
        
            case "":
                res = new Response(
                    cachedTabsPage
                        .replaceAll("$tabcount", (Object.values(tabInfo).reduce((a,b) => a + b.allTabs, 0) || "?").toString())
                        .replaceAll("$windowcount", (Object.values(tabInfo).reduce((a,b) => a + b.allWindows, 0) || "?").toString())
                        .replaceAll("$otherdevices", Object.entries(tabInfo).map(([x,v]) => 
                            `<strong><span id="${x}.status" title="${v.online ? "Online" : "Offline"}" style="color:${v.online ? "#66FFAA" : "#FF6666"}">&#x2022;</span>`
                            + ` ${x}:</strong> <slot id="${x}.tabCount">${v.allTabs}</slot> tabs open`
                            + ` in <slot id="${x}.windowCount">${v.allWindows}</slot> window(s)`
                        ).join("<br>"))
                        .replaceAll("display:unset", Object.values(tabInfo).every(e => e.online) ? "display:none" : "display:unset")
                )
                res.headers.set("content-type", "text/html")
                return res
            break
            case "/count":
                // first, let's try upgrading them to a websocket connection
                if (server.upgrade(req)) return

                // if they're not willing to connect over ws, let's see what they want to do
                if (req.method == "GET") return new Response(JSON.stringify(tabInfo), { headers: { "Access-Control-Allow-Origin": "*" } })
                else if (req.method == "PUT") {
                    let device = Object.entries(devices)
                            .find(e => e[1] == req.headers.get("X-Token"))
                            ?.[0] as Device|undefined
                    if (!device) return
                    updateTabInfo(device, await req.json() || {})

                    return new Response("OK", { headers: { "Access-Control-Allow-Origin": "*" } })
                }
            break;
            case "/spacemono.ttf":
                return new Response(SPACEMONO)
            break
            case "/button.svg":
                let tabsOpen = (Object.values(tabInfo).reduce((a,b) => a + b.allTabs, 0) || "?").toString()
                /*let subset = SPACEMONO_FK.createSubset()
                SPACEMONO_FK.layout(
                    Array.from(new Set(
                        Array.from(
                            `split tabs open ${tabsOpen}`
                        )
                    ).values()).join("")
                ).glyphs.forEach(e => subset.includeGlyph(e))
                let encodedFont = Buffer.from(subset.encode()).toString("base64")
                */
                return new Response(
                    cachedButton
                        .replaceAll("$tabCount", tabsOpen)
                        /*.replaceAll("$fontData", encodedFont)*/,
                        {
                            headers: {
                                "Content-Type": "image/svg+xml",
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "Pragma": "no-cache",
                                "Expires": "0"
                            }
                        }
                )
            break
            default:
                return Response.redirect("/")
        }
    },

    websocket: {

        message(ws, message) {
            if (ws.data) {
                updateTabInfo(ws.data, JSON.parse(message.toString()))
            } else {
                let device = Object.entries(devices)
                        .find(e => e[1] == message.toString())
                        ?.[0] as Device|undefined
                
                if (!device || tabInfo[device].online) return ws.close(4500,"invalid key")
                ws.data = device
                tabInfo[device].online = true
                updateListeners()
            }
        },

        open(ws) {
            ws.send(JSON.stringify(tabInfo))
            listening.push(ws)
        },

        close(ws) {
            if (ws.data) {
                tabInfo[ws.data].online = false
                updateListeners()
            }
            listening.splice(listening.indexOf(ws), 1)
        }

    },

    port: process.env.PORT ?? 3000
} as Serve<Device> /* bun won't accept this for some reason if i don't do as Serve */)
