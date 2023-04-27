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

export class ScenarioCommand {

    static create(input) {
        const scenarios = []

        scenarios.push(
            ScenarioCommand.toScenario(
                input,
                utils.toReplace(input.generateForEach, input.replace),
                findReplaceRule(input.replaceRules, 1, 1),
                1
            )
        )

        return scenarios //toInteractionsWithConfig(input, scenarios)
    }


    static toScenario(input, globalReplace, replaceRule = {}, scenarioExecutionNumber = 1) {
        replaceRule.generateConstants = toGenerateConstants(replaceRule.generateConstants || [])

        return Object.entries(input.commands)
            .map(([commandName, command]) => {
                const interactions = Object.entries(command.interactions)
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

                return {
                    [commandName]: {
                        command: command,
                        interactions: interactions
                    }
                }
            })
    }
}
