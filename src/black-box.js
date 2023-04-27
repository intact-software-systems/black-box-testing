import {compareJson, COMPARISON, toConfig} from './compareJson.js'
import {
    FAILURE,
    fetchDataBasic,
    toInteractionConfig,
    toInteractionName, toJson,
    toNetworkInteraction,
    toOutputKey,
    toRequest,
    toStatus,
    toSuccessStatus
} from './black-box-utils.js'

export class BlackBox {

    static execute(interactions, index, output) {
        const executeNext = interactionData => {
            const data = {
                [interactionData.name + '-' + (index + 1)]: interactionData
            }

            if (interactionData.status === FAILURE) {
                return data
            }

            if (interactionData.output) {
                output.set(
                    interactionData.output,
                    {
                        [interactionData.output]: interactionData.actual
                    }
                )
            }

            output.set(
                toOutputKey(interactionData),
                {
                    [toOutputKey(interactionData)]: interactionData.actual
                }
            )

            if (index + 1 < interactions.length) {
                return this.execute(interactions, ++index, output)
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

        return this.#executeInteraction(interactions[index], output)
            .then(data => executeNext(data))
            .catch(e => executeNext(e))
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

