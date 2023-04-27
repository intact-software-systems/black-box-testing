import {Command} from './command.js'

export class Commands {

    static #createTestConfig = (command) => Command.toCommandConfig(
        command,
        Command.toCallbacks(
            d => console.log(JSON.stringify(d)),
            e => console.error('error: ', e),
            status => console.log('completed :' + status.status),
            timeoutId => console.log('Timeout id:' + timeoutId),
            () => console.log('Task interrupted')
        ),
        Command.toPolicy(
            4,
            20,
            2000,
            2000
        )
    )

    static async runParallel(configs) {
        const commandsConfig = this.#createTestConfig(
            async () => await Promise.all(configs.map(config => Command.runCommand(config)))
        )

        return await Command.runCommand(commandsConfig)
    }

    static async runSequential(configs) {
        const data = []
        for (const config of configs) {
            const result = await Command.runCommand(config)

            data.push(result)
        }
        return data
    }
}
