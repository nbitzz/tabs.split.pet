export class Bot {
    readonly instance: string = process.env.FF_INSTANCE!
    readonly token: string = process.env.FF_TOKEN!

    constructor(instance?: string, token?: string) {
        if (instance) this.instance = instance
        if (token) this.token = token
        if (!this.instance || !this.token)
                throw new Error("either instance or token not defined")
    }

    fetch(rt: `/${string}`, body?: Record<string, any>) {
        return fetch(`https://${this.instance}/api${rt}`, {
            ...(body ? {body: JSON.stringify(body)} : {}),
            method: body ? "POST" : "GET",
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json"
            }
        })
    }
    
    note(text: string) {
        console.log(text)
        return this.fetch('/notes/create', {
            text,
            visibility: "home"
        })
    }
}

const botSingleton = new Bot()
export default botSingleton