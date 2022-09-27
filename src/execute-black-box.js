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

function toStatus(result, actualJson, res, interaction, testResult) {
    return {
        test: testResult,
        result: result,
        method: interaction.request.method,
        path: interaction.request.path,
        expected: interaction.response,
        actual: {
            body: actualJson,
            statusCode: res.status,
            statusText: res.statusText
        }
    }
}

function executeInteraction(index, interactionWithConfig) {
    const interaction = toNetworkInteraction(interactionWithConfig)

    if (!interaction) {
        return Promise.resolve()
    }

    return fetchDataBasic(interaction.request)
        .then(async res => {
            const returnedJson = await toJson(res)

            if (!res.ok) {
                return toStatus('Server request failed.', returnedJson, res, interaction, FAILURE)
            }

            if (interaction?.response?.body) {
                if (!returnedJson) {
                    return toStatus('Server with no body in response. Expects a body.', returnedJson, res, interaction, FAILURE)
                } else {
                    if (!compare.isJsonStructureCompatible(interaction.response.body, returnedJson)) {
                        return toStatus('Expected response incompatible with actual response', returnedJson, res, interaction, FAILURE)
                    }

                    if (!compare.isJsonCompatible(interaction.response.body, returnedJson)) {
                        return toStatus('Expected response not the same as actual response', returnedJson, res, interaction, FAILURE)
                    }
                }
            }

            if (interaction?.response?.statusCode && Number.parseInt(interaction.response.statusCode) !== res.status) {
                return toStatus('Expected responseCode not the same as actual responseCode', returnedJson, res, interaction, FAILURE)
            }

            return toStatus('OK', returnedJson, res, interaction, SUCCESS)
        })
        .then(status => {
            if (status.test === FAILURE) {
                throw status
            }
            return status
        })
        .then(data => {
            return {
                [index]: data
            }
        })
        .catch(e => {
            return {
                [index]: {
                    exception: e?.message,
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

