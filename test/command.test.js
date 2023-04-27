import {Command} from '../src/commands/command.js'

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

Deno.test('command', async _ => {
    const config = createTestConfig()

    setTimeout(
        async () => {
            console.log('Interrupt task')
            config.interrupt = true
        },
        10000
    )

    await Command.runCommand(config)

    console.log('progress')
})

