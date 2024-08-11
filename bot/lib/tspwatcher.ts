import { type DeviceTabkeeper } from "../../app/index"
import EventEmitter from "node:events"

interface Status {
    allTabs: number
    allWindows: number
}

export class TSPWatcher extends EventEmitter<{tabsChanged: number, windowsChanged: number, changed: Status}> {

    readonly count: string
    socket: WebSocket
    currentStatus: Status = { allTabs: 0, allWindows: 0 }

    constructor(count: string = process.env.TAB_COUNTER || "http://app:3000/count") {
        super()
        if (count) this.count = count
        if (!this.count)
            throw new Error("TSP url not set")

        this.generateSocket()
    }

    generateSocket() {
        if (this.socket && this.socket.readyState != 3) {
            this.socket.close();
        }

        this.socket = new WebSocket(this.count.replace("http","ws"))

        this.socket.addEventListener("message", (message) => {
            let data = JSON.parse(message.data.toString()) as DeviceTabkeeper

            let allTabs = Object.values(data).reduce((a, b) => a + b.allTabs, 0)
            let allWindows = Object.values(data).reduce((a, b) => a + b.allWindows, 0)

            let changes = [
                ...(allTabs != this.currentStatus.allTabs ? [{event: "tabsChanged", value: allTabs}] : []),
                ...(allWindows != this.currentStatus.allWindows ? [{event: "windowsChanged", value: allWindows}] : [])
            ]

            this.currentStatus = {
                allTabs,
                allWindows
            }

            changes.forEach(e => this.emit(e.event, e.value))
            if (changes.length)
                this.emit("changed", this.currentStatus)
        })

        this.socket.addEventListener("close", () => this.generateSocket())
    }

}

const tspSingleton = new TSPWatcher()
export default tspSingleton