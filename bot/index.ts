import bot from "./lib/bot"
import tsp from "./lib/tspwatcher"
import mem from "./lib/memory"
import lazy, {resetLazy} from "./lib/lazy"

let lastTabCt = await new Promise((res) => tsp.once("tabsChanged", tabs => res(tabs)))
let lgTabDropStart: number | null = null

tsp.on("tabsChanged", async tabs => {
    // Jumps
    
    if (lgTabDropStart)
        resetLazy("lgDrop")
    else if (lastTabCt-tabs > 50 || lastTabCt-tabs < -50) {
        lgTabDropStart = lastTabCt
        lazy("lgDrop", () => {
            if (lgTabDropStart-tabs > 50 || lgTabDropStart-tabs < -50) {
                let dropped = lgTabDropStart-tabs > 50

                bot.note(
                    `${dropped ? "⚠️" : "🚀"} **Jump:** split's tab count just ${dropped ? "dropped" : "rose"}`
                    + ` by **${Math.abs(lgTabDropStart-tabs)}** tabs to`
                    + ` **${tabs}** in ${tsp.currentStatus.allWindows} windows.`
                )
            }
            lgTabDropStart = null
        }, 5000)
    }

    if (Math.floor(tabs/100) > await mem.get("lastMilestone")) {
        mem.set("lastMilestone", Math.floor(tabs/100))
        bot.note(`🎉 **Milestone:** split's tab count is now **${tabs}**.`)
    }

    lastTabCt = tabs

})