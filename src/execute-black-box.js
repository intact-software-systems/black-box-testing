import * as compare from './compareJson.js'

const SUCCESS = 'SUCCESS'
const FAILURE = 'FAILURE'

const output = new Map()

function toBody(request) {
    if (request.form) {
        return new URLSearchParams(request.form)
    }

    return request.body && request.method !== undefined && request.method !== 'GET'
        ? JSON.stringify(request.body)
        : undefined
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
        status: FAILURE,
        result: result,
        method: interaction.request.method || 'GET',
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

function toSuccessStatus(config, actualJson, response, interaction) {
    return {
        name: config.interactionName,
        status: SUCCESS,
        result: 'OK',
        method: interaction.request.method,
        path: interaction.request.path,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: response.status,
            statusText: response.statusText
        },
        output: interaction.request.output,
        input: interaction.request.input
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

function toInteraction(interactions, index) {
    return interactions[index] || interactions[index]
}

function toNetworkInteraction(interaction) {
    return interaction?.HTTP || interaction?.MQ
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

function toRequest(request) {
    if (!request.input || request.input.length <= 0) {
        return request
    }

    let returnRequest = JSON.stringify(request)

    request.input
        .map(i => {
            const data = output.get(i)
            if (data === undefined) {
                throw 'Input data was not found: ' + i
            }
            return data
        })
        .forEach(data => {
            const getValuePaths = (currPath, item, valuePaths = []) => {
                if (!Array.isArray(item) && typeof item !== 'object')
                    valuePaths.push(currPath)

                if (Array.isArray(item)) {
                    item.forEach((el, idx) => getValuePaths(`${currPath}.${idx}`, el, valuePaths))
                } else if (typeof item == "object") {
                    Object.entries(item)
                        .forEach(([key, value]) => {
                            getValuePaths(`${currPath}.${key}`, value, valuePaths)
                        })
                }
                return valuePaths
            }

            const resolve = (path, obj) => {
                return path.split('.')
                    .reduce((prev, curr) => prev ? prev[curr] : null, obj || self)
            }

            Object.entries(data)
                .forEach(([key, value]) => {
                    getValuePaths(key, value)
                        .forEach(path => {
                            const pathData = resolve(path, data)

                            returnRequest = returnRequest.replaceAll('{' + path + '}', pathData)
                        })

                })

        })

    return JSON.parse(returnRequest)

}

function executeInteraction(index, interactionWithConfig) {
    const interaction = toNetworkInteraction(interactionWithConfig)

    if (!interaction) {
        return Promise.resolve()
    }

    interaction.request = toRequest(interaction.request)

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

            return toSuccessStatus(config, actualJson, response, interaction)
        })
        .catch(e => {
            return {
                name: config.interactionName,
                exception: e?.message,
                ...config
            }
        })
}


export function executeBlackBox(interactions, index) {
    const executeNext = interactionData => {
        const data = {
            [interactionData.name + '-' + index]: interactionData
        }

        if (interactionData.output) {
            output.set(
                interactionData.output,
                {
                    [interactionData.output]: interactionData.actual
                }
            )
        }

        if (interactionData.status === FAILURE) {
            return data
        }

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

