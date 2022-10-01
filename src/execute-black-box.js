import * as compare from './compareJson.js'

const SUCCESS = 'SUCCESS'
const FAILURE = 'FAILURE'

function toBody(request) {
    return request.body && request.method !== 'GET'
        ? JSON.stringify(request.body)
        : undefined
}

function fetchDataBasic(request) {
    return fetch(
        request.path,
        {
            method: request.method,
            credentials: 'omit',
            mode: 'cors',
            headers: request.headers,
            body: toBody(request)
        }
    )
}

async function toJson(res) {
    return res.json()
        .catch(() => {
            return {}
        })
}

function toStatus(config, result, actualJson, res, interaction, results = {}) {
    return {
        name: config.interactionName,
        test: FAILURE,
        result: result,
        method: interaction.request.method,
        path: interaction.request.path,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: res.status,
            statusText: res.statusText
        },
        details: results,
        ...config
    }
}

function toSuccessStatus(name, actualJson, response, interaction) {
    return {
        name: name,
        test: SUCCESS,
        result: 'OK',
        method: interaction.request.method,
        path: interaction.request.path,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: response.status,
            statusText: response.statusText
        }
    }
}

function toInteractionName(interactionWithConfig) {
    return Object.keys(interactionWithConfig)
        .filter(key => key !== 'HTTP')
        [0]
}

function toInteractionConfig(interactionWithConfig) {
    const name = toInteractionName(interactionWithConfig)

    return {
        interactionName: name,
        ...interactionWithConfig[name]
    }
}

function executeInteraction(index, interactionWithConfig) {
    const interaction = toNetworkInteraction(interactionWithConfig)
    const config = {
        interactionName: toInteractionName(interactionWithConfig),
        interactionConfig: toInteractionConfig(interactionWithConfig),
        interaction: interaction
    }

    if (!interaction) {
        return Promise.resolve()
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
                } else {

                    {
                        let results = compare.isJsonStructureCompatible(interaction.response.body, actualJson)
                        if (!results.isEqual) {
                            return toStatus(config, 'Expected response incompatible with actual response', actualJson, response, interaction, results)
                        }
                    }

                    {
                        let results = compare.isJsonCompatible(interaction.response.body, actualJson)
                        if (!results.isEqual) {
                            return toStatus(config, 'Expected response not the same as actual response', actualJson, response, interaction, results)
                        }
                    }
                }
            }

            if (interaction?.response?.statusCode && Number.parseInt(interaction.response.statusCode) !== response.status) {
                return toStatus(config, 'Expected responseCode not the same as actual responseCode', actualJson, response, interaction)
            }

            return toSuccessStatus(config.interactionName, actualJson, response, interaction)
        })
        .then(data => {
            return {
                [index + '-' + config.interactionName]: data
            }
        })
        .catch(e => {
            return {
                [index]: {
                    exception: e?.message,
                    name: config,
                    config: interactionWithConfig
                }
            }
        })
}

function toInteraction(interactions, index) {
    return interactions[index] || interactions[index]
}

function toNetworkInteraction(interaction) {
    return interaction?.HTTP || interaction?.MQ
}


export function executeBlackBox(interactions, index) {
    const executeNext = data => {
        if (index + 1 < interactions.length) {
            return executeBlackBox(interactions, ++index)
                .then(d => {
                    return {...data, ...d}
                })
                .catch(e => {
                    return {...data, ...e}
                })
        } else {
            return data
        }
    }

    return executeInteraction(index + 1, toInteraction(interactions, index))
        .then(data => executeNext(data))
        .catch(e => executeNext(e))
}

