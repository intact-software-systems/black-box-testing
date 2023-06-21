import {Command} from '../src/command.js'

const createTestConfig = () => Command.toCommandConfig(
    () =>
        fetch('http://api.football-data.org/v4/competitions/')
            .then(res => res.json())
            .catch(() => ({})),
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
export function runSequential(configs, index) {
    const executeNext = data => {
        if (index + 1 < configs.length) {
            return runSequential(configs, ++index)
                .then(d => {
                    return {...data, ...d}
                })
                .catch(e => {
                    return {...data, ...e}
                })
        }
        else {
            return data
        }
    }

    return Command.runCommand(configs[index])
        .then(data => executeNext(data))
        .catch(e => executeNext(e))
}

export async function runSequentialAlt(configs) {
    for (const config of configs) {
        await Command.runCommand(config)
    }
}


// NOTE: await doesn't work, runs in background
export async function runSequentialWithMap(configs) {
    return await configs.map(async (config) => await Command.runCommand(config))
}

Deno.test('commands in sequence', async _ => {

    let configs = []
    for (let i = 0; i < 10; i++) {
        configs.push(createTestConfig())
    }

    await runSequentialAlt(configs)

    console.log('progress')
})
