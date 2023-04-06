import utils from './utils.js'
import {toRandomFromType} from './type-generators.js'
import {toJsonMock, toSchemaType} from './json-mock-from-schema.js'

function toTechnology(technology) {
    return technology || 'HTTP'
}

function replaceData(target, config) {
    if (target === undefined) {
        return {}
    }

    let returnTarget = target
    Object.keys(config)
        .forEach(key => {
            returnTarget = returnTarget.replaceAll('{' + key + '}', config[key])
        })

    return JSON.parse(returnTarget)
}

function toRuleRange(key, maxNumber) {
    if (key.startsWith('>')) {
        return [Number.parseInt(key.replace('>', '')), Number.parseInt(maxNumber)]
    }

    if (key.includes('-')) {
        const numbers = key.split('-')
        if (numbers[0] > numbers[1]) {
            throw 'Invalid number range: ' + key
        }

        return [Number.parseInt(numbers[0]), Number.parseInt(numbers[1])]
    }

    const number = Number.parseInt(key)
    if (number) {
        return [number, number]
    }

    return [0, 0]
}

function findReplaceRule(replaceRules, i, numOf) {
    let entries = Object.entries(replaceRules || {})
    if (entries.length <= 0) {
        return {}
    }

    return entries
        .filter(([key, _value]) => {
            const range = toRuleRange(key, numOf)
            return range[0] <= i && range[1] >= i
        })
        .map(([_key, value]) => {
            return value
        })[0] || {}
}

function replaceAlways(target, replace, generateAlways) {
    if (!target) {
        return target
    }

    const config = {
        ...replace,
        ...utils.generateReplace(generateAlways, replace)
    }

    const keys = Object.keys(config)

    let returnTarget = target
    keys.forEach(key => {
        returnTarget = returnTarget.replaceAll(
            '{' + key + '}',
            () => {
                const newConfig = {
                    ...replace,
                    ...utils.generateReplace(generateAlways, replace)
                }

                return newConfig[key]
            }
        )
    })

    return JSON.parse(returnTarget)
}

function toInteraction(input) {
    const interaction = {
        request: {
            interactionExecutionNumber: input.interactionExecutionNumber,
            scenarioExecutionNumber: input.scenarioExecutionNumber
        },
        response: {}
    }

    Object.keys(input.requestTemplate)
        .forEach(key => {
            if (input.generateAlways && input.generateAlways.length > 0) {
                interaction.request[key] = replaceAlways(JSON.stringify(input.requestTemplate[key]), input.replace, input.generateAlways)
            }
            else {
                interaction.request[key] = replaceData(JSON.stringify(input.requestTemplate[key]), input.replace)
            }
        })

    Object.keys(input.responseTemplate)
        .forEach(key => {
            if (input.generateAlways && input.generateAlways.length > 0) {
                interaction.response[key] = replaceAlways(JSON.stringify(input.responseTemplate[key]), input.replace, input.generateAlways)
            }
            else {
                interaction.response[key] = replaceData(JSON.stringify(input.responseTemplate[key]), input.replace)
            }
        })

    return {
        [input.technology]: {
            ...interaction
        }
    }
}

function findGeneratedConstant(generateConstants, key, i) {
    if (!generateConstants.length) {
        return undefined
    }

    const constant = generateConstants.find(c => c.constant === key)
    if (!constant) {
        return undefined
    }

    if (constant.generated.length < i + 1) {
        return undefined
    }

    return constant.generated[i]
}

function toArrayPosition(value) {
    const start = value.indexOf('[')
    const end = value.indexOf(']')

    return value.substring(start + 1, end)
}

function toFilteredObject(replace, matcher) {
    let entries = Object.entries(replace || {})
    if (entries.length <= 0) {
        return {}
    }

    let filtered = entries
        .filter(([_key, value]) => matcher(value))
        .map(([key, value]) => {
            return {
                [key]: value
            }
        })

    return filtered.length === 0
        ? {}
        : filtered.reduce((a, b) => {
            return {...a, ...b}
        })
}

function toReplaceEntriesToInject(replace) {
    return toFilteredObject(
        replace,
        value => value.match('^[$][{].*.}$')
    )
}

function toReplaceEntriesToNotInject(replace) {
    return toFilteredObject(
        replace,
        value => !value.match('^[$][{].*.}$')
    )
}

function toConstantName(value) {
    const start = value.indexOf('{')
    const end = value.indexOf('[')

    return value.substring(start + 1, end)
}

function toInjectGeneratedValues(replace, generateConstants, i) {
    let entries = Object.entries(replace || {})
    if (entries.length <= 0) {
        return {}
    }

    return entries
        .map(([key, value]) => {
            const position = toArrayPosition(value)
            const constantName = toConstantName(value)

            const constant = findGeneratedConstant(generateConstants, constantName, position === 'N' || position === 'n' ? i : Number.parseInt(position))
            if (constant === undefined) {
                return {}
            }
            return {
                [key]: constant
            }
        })
        .reduce((a, b) => {
            return {...a, ...b}
        })
}

function toInteractions(input, numOfInteractions = 1) {
    const interactions = []

    for (let i = 1; i <= numOfInteractions; i++) {
        input.interactionExecutionNumber = i

        const replaceRule = findReplaceRule(input.interactionReplaceRules, i, numOfInteractions)

        input.generateForEach = [
            ...(input.generateForEach ? input.generateForEach : []),
            ...(replaceRule.generateForEach ? replaceRule.generateForEach : [])
        ]

        input.generateAlways = [
            ...(input.generateAlways ? input.generateAlways : []),
            ...(replaceRule.generateAlways ? replaceRule.generateAlways : [])
        ]

        const generated = utils.generateReplace(input.generateForEach, input.replace)

        const resolvedReplace = toInjectGeneratedValues(
            toReplaceEntriesToInject(replaceRule.replace),
            input?.scenarioReplaceRule?.generateConstants,
            i
        )

        input.replace = {
            ...input.replace,
            ...generated,
            ...toReplaceEntriesToNotInject(replaceRule.replace),
            ...resolvedReplace
        }

        interactions.push(toInteraction(input))
    }

    return {
        [input.interactionName]: interactions
    }
}

function toHeaders(headerFile, headers, defaultHeaders) {
    if (headerFile) {
        return utils.openFile(headerFile)
    }

    return headers ? headers
        : defaultHeaders instanceof Object ? defaultHeaders
            : utils.openFile(defaultHeaders)
}

function resolveTemplate(data) {
    return data?.templateFile
        ? utils.openFile(data.templateFile)
        : data?.template
}

function resolveEntry(data, template) {
    return data?.entryName
        ? utils.resolvePathData(data.entryName, template)
        : undefined
}

function resolveInputData(data) {
    return resolveEntry(data, resolveTemplate(data)) || data
}

function toRequest(request) {
    const {
        headerFile,
        ...outRequest
    } = request // filter out headerFile

    outRequest.body = request.body ? resolveInputData(request.body) : {}

    return outRequest
}

function toResponse(response) {
    if (response === undefined) {
        return {}
    }

    const {...outResponse} = response

    outResponse.body = response.body ? resolveInputData(response.body) : undefined

    if (!outResponse.body) {
        const template = resolveTemplate(response.schema)
        const schema = resolveEntry(response.schema, template)

        outResponse.body = toJsonMock(toSchemaType(template), schema)
    }

    return outResponse
}

function toInteractionTemplate(interaction) {
    const interactionData = resolveInputData(interaction)

    return interactionData[toTechnology(interaction.technology)] || interactionData
}

function toGenerateAlways(inputGenerateAlways, interactionGenerateAlways) {
    return [
        ...(inputGenerateAlways ? inputGenerateAlways : []),
        ...(interactionGenerateAlways ? interactionGenerateAlways : [])
    ]
}

function toScenario(input, globalReplace, replaceRule = {}, scenarioExecutionNumber = 1) {
    replaceRule.generateConstants = toGenerateConstants(replaceRule.generateConstants || [])

    return Object.entries(input.interactions)
        .map(([interactionName, interaction]) => {
            const interactionTemplate = toInteractionTemplate(interaction)

            if (interactionTemplate === undefined || interactionTemplate.request === undefined) {
                console.log(interaction)
                throw new Error('Cannot find interaction template')
            }

            return toInteractions(
                {
                    interactionName: interactionName,
                    scenarioExecutionNumber: scenarioExecutionNumber,
                    replace: {
                        ...globalReplace,
                        ...interaction?.replace
                    },
                    interactionReplaceRules: interaction.replaceRules,
                    scenarioReplaceRule: replaceRule,
                    technology: toTechnology(interaction.technology),
                    generateForEach: interaction.generateForEach || [],
                    generateAlways: toGenerateAlways(input.generateAlways, interaction.generateAlways),
                    requestTemplate: {
                        ...toRequest(interactionTemplate.request),
                        headers: toHeaders(
                            interactionTemplate.request?.headerTemplateFile,
                            interactionTemplate.request?.headers,
                            input?.headerTemplateFile?.[toTechnology(interaction.technology)] || input?.headerTemplateFile || input?.headers
                        )
                    },
                    responseTemplate: {
                        ...toResponse(interactionTemplate.response)
                    }
                },
                interaction.numOfInteractions ? Number.parseInt(interaction.numOfInteractions) : 1
            )
        })
}

function toGenerateConstants(generateConstants) {
    return generateConstants
        .map(constant => {
            return {
                ...constant,
                generated: toRandomFromType(
                    constant.type,
                    constant.min,
                    constant.max,
                    constant.numberOf || 1,
                    constant?.decimals
                )
            }
        })
}

function createScenariosFromInput(input, numOfScenarios = 1) {
    const scenarios = []
    for (let i = 1; i <= numOfScenarios; i++) {
        scenarios.push(
            toScenario(
                input,
                utils.toReplace(input.generateForEach, input.replace),
                findReplaceRule(input.replaceRules, i, numOfScenarios),
                i
            )
        )
    }

    return scenarios
}

function toInteractionsWithConfig(input, scenarios) {
    return scenarios
        .map(scenario => {
            if (scenario.length <= 0) {
                return {}
            }

            return scenario
                .map(interactionArray => {
                    return {
                        interactionArray: interactionArray
                    }
                })
        })
        .map(allInteractionsWithConfig => {
            return allInteractionsWithConfig
                .map(interactionsWithConfig => {
                        return Object.entries(interactionsWithConfig.interactionArray)
                            .map(([key, interactions]) => {
                                    return interactions
                                        .map(interaction => {
                                            return {
                                                ...interaction,
                                                [key]: input.interactions[key]
                                            }
                                        })
                                }
                            )
                    }
                )
                .flatMap(a => a)
        })
        .flatMap(a => a)
}

export function createScenarios(input) {
    const scenarioJson = createScenariosFromInput(
        input,
        input.numOfScenarios ? Number.parseInt(input.numOfScenarios) : 1
    )

    return toInteractionsWithConfig(input, scenarioJson)
}
