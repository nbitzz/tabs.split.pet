import bot from "./lib/bot"
import tsp from "./lib/tspwatcher"
import mem from "./lib/memory"
import lazy, {resetLazy} from "./lib/lazy"

/* Milestones */ {

    tsp.on("tabsChanged", async tabs => {

        if (Math.floor(tabs/100) > (await mem.get("lastMilestone") || 0)) {
            mem.set("lastMilestone", Math.floor(tabs/100))
            bot.note(`🎉 **Milestone!** split's tab count is now **${tabs}**.`)
        }

    })

}

/* Jumps */ {

    let lastTabCount = await new Promise<number>((res) => tsp.once("tabsChanged", tabs => res(tabs)))
    let tabDropAnchor: number | null = null

    tsp.on("tabsChanged", async tabs => {
        lastTabCount = tabs

        if (tabDropAnchor)
            resetLazy("lgDrop") // reset if there's already an anchor
        else {
            tabDropAnchor = lastTabCount
            lazy("lgDrop", () => {
                if (!tabDropAnchor) return
                const difference = tabDropAnchor-tabs

                if (Math.abs(difference) > 50) {
                    let dropped = difference > 50

                    bot.note(
                        `${dropped ? "⚠️" : "🚀"} **Jump:** split's tab count just ${dropped ? "dropped" : "rose"}`
                        + ` by **${Math.abs(difference)}** tabs to`
                        + ` **${tabs}** in ${tsp.currentStatus.allWindows} windows.`
                    )
                }
                tabDropAnchor = null
            }, 5000)
        }

    })

}