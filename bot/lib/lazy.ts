const LazyList = new Map<string, { to: ReturnType<typeof setTimeout>, f: () => void, t: number }>()

export default function lazy(id: string, f: () => void, t: number) {
    if (LazyList.has(id))
        clearTimeout(LazyList.get(id)!.to)

    LazyList.set(id, { to: setTimeout(() => {
        LazyList.delete(id)
        f()
    }, t), f, t })
}

export function resetLazy(id: string) {
    if (!LazyList.has(id)) return
    let lz = LazyList.get(id)!
    lazy(id, lz.f, lz.t)
}