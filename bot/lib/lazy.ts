const LazyCch = new Map<string, { to: ReturnType<setTimeout>, f: () => void, t: number }>()

export default function lazy(id: string, f: () => void, t: number) {
    if (LazyCch.has(id))
        clearTimeout(id)

    LazyCch.set(id, { to: setTimeout(() => {
        LazyCch.delete(id)
        f()
    }, t), f, t })
}

export function resetLazy(id: string) {
    if (!LazyCch.has(id)) return
    let lazy = LazyCch.get(id)
    lazy(id, lazy.f, lazy.t)
}