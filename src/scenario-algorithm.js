import utils from './utils.js'
import {
    findReplaceRule,
    toInteractionsWithConfig,
    toInteractions,
    toTechnology,
    toGenerateAlways,
    toHeaders,
    toResponse,
    toGenerateConstants,
    toInteractionTemplate, toRequest
} from './scenario-utils.js'

export class ScenarioAlgorithm {

    static create(input) {
        const numOfScenarios = input.numOfScenarios ? Number.parseInt(input.numOfScenarios) : 1
        const scenarios = []

        for (let i = 1; i <= numOfScenarios; i++) {
            scenarios.push(
                ScenarioAlgorithm.toScenario(
                    input,
                    utils.toReplace(input.generateForEach, input.replace),
                    findReplaceRule(input.replaceRules, i, numOfScenarios),
                    i
                )
            )
        }

        return toInteractionsWithConfig(input, scenarios)
    }

    static toScenario(input, globalReplace, replaceRule = {}, scenarioExecutionNumber = 1) {
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
}
