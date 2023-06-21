import {Commands} from './commands.js'
import {Command} from './command.js'
import {FAILURE, fetchDataBasic, toInteractionConfig, toInteractionName, toJson, toNetworkInteraction, toRequest, toStatus, toSuccessStatus} from './black-box-utils.js'
import {compareJson, COMPARISON, toConfig} from './compareJson.js'

export class BlackBoxCommand {
    static execute(commands, index, output) {

        for (let i = 0; i < commands.length; i++) {
            const commandGroups = commands[i]

            Object.entries(commandGroups)
                .forEach(([key, value]) => {
                    console.log(key)
                    console.log(value)

                    const commandGroupName = key
                    const commandGroup = value

                    const executionStyle = commandGroup.command.execution // sequential | parallel

                    const interactionsParsed = commandGroup.interactions

                    const interactionKeys = Object.keys(commandGroup.command.interactions)


                    const configs = Object.entries(commandGroup.command.interactions)
                        .map(([key, value]) => {

                            const parsedInteraction = interactionsParsed[key][0]

                            let config = Command.toCommandConfig(
                                () => this.#executeInteraction(parsedInteraction, output),
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
                            return {
                                [key]: config
                            }
                        })
                        .reduce((a, b) => ({...a, ...b}))

                    Commands.runSequentialBasedOnEither(configs, interactionKeys)
                        .then(r => console.log("Finished"))
                        .catch(e => console.error(e))
                })

        }

    }


    static #executeInteraction(interactionWithConfig, output) {
        const interaction = toNetworkInteraction(interactionWithConfig)

        if (!interaction) {
            return Promise.resolve()
        }

        interaction.request = toRequest(interaction.request, output)

        const config = {
            interactionName: toInteractionName(interactionWithConfig),
            interactionConfig: toInteractionConfig(interactionWithConfig),
            interaction: interaction
        }

        return fetchDataBasic(interaction.request)
            .then(async response => {
                const actualJson = await toJson(response)

                if (!response.ok) {
                    return toStatus(config, 'Server request failed.', actualJson, response, interaction)
                }

                if (interaction?.response?.body) {
                    if (!actualJson) {
                        return toStatus(config, 'Server with no body in response. Expects a body.', actualJson, response, interaction)
                    }
                    else {
                        let results = compareJson(
                            interaction.response.body,
                            actualJson,
                            toConfig(
                                interaction.response?.comparison || COMPARISON.COMPATIBLE,
                                interaction.response?.ignoreJsonKeys || [],
                                interaction.response?.ignoreJsonPaths || []
                            )
                        )

                        if (!results.isEqual) {
                            return toStatus(config, 'Expected response not the same as actual response', actualJson, response, interaction, results)
                        }
                    }
                }

                if (interaction?.response?.statusCode && Number.parseInt(interaction.response.statusCode) !== response.status) {
                    return toStatus(config, 'Expected responseCode not the same as actual responseCode', actualJson, response, interaction)
                }

                return toSuccessStatus(config, actualJson, response, interaction)
            })
            .catch(e => {
                return {
                    name: config.interactionName,
                    exception: e?.message,
                    status: FAILURE,
                    ...config
                }
            })
    }

}
