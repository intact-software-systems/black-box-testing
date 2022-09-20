import scenarios from './src/scenario-algorithm.js'
import utils from './src/utils.js'

import { Command } from "https://deno.land/x/cmd@v1.2.0/commander/index.ts"

const program = new Command()

program
    .requiredOption('-c, --config <config>', 'Config file in json format')
    .option('-w, --workingDirectory <workingDirectory>', 'Working directory')
    .option('-o, --override <override>', 'Override global replace tags. Example: tag1=value,tag2=value . No space in string')

program.on('-h, --help', () => {
    console.log('')
    console.log('Example calls:')
    console.log('  $ scenario-generate --config deno.json')
    console.log('  $ scenario-generate -c deno.json')

    console.log('  $ scenario-generate --config deno.json --override url=http://localhost:8080/led/api/v1,valuDate=2022-10-01')
    console.log('  $ scenario-generate -c deno.json -o url=http://localhost:8080/led/api/v1,valuDate=2022-10-01')
    console.log('  $ scenario-generate -c deno.json -w ./test-data -o url=http://localhost:8080/led/api/v1,valuDate=2022-10-01')
})

program.parse(process.argv)

utils.setWorkingDirectory(program.opts().workingDirectory || '.')

const input = utils.openFile(program.opts().config)

input.replace = {
    ...input.replace,
    ...(utils.inputOverridesToJson(program.opts().override))
}

const requests = scenarios.createScenarios(input, input.numOfScenarios || 1)

const fileName = input.outputFile || 'scenario.json'
utils.saveToFile(fileName, requests)

console.log('Generated scenario to file ' + fileName)
