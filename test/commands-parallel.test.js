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

Deno.test('commands in parallel', async _ => {

    let configs = []
    for (let i = 0; i < 10; i++) {
        configs.push(createTestConfig())
    }

    const commandsConfig = createTestConfig()
    commandsConfig.command = async () => await Promise.all(configs.map(config => Command.runCommand(config)))

    await Command.runCommand(commandsConfig)

    console.log('progress')
})
