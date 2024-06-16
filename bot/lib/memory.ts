// This is all we need for such a simple bot so
import type { BunFile } from "bun"

export class Memory {

    readonly file: BunFile
    memory: any

    constructor() {
        this.file = Bun.file(process.env.MEMORY_LOCATION || `${process.cwd()}/.data/memory.json`)
    }

    async get(key: string) {
        if (!this.memory)
            if (await this.file.exists()) this.memory = await this.file.json()
            else this.memory = {}

        return this.memory[key]
    }

    set(key: string, value: any) {
        this.memory[key] = value
        return Bun.write(this.file, this.memory)
    }

}

const memorySingleton = new Memory()
export default memorySingleton