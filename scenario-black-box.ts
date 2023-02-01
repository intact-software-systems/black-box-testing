import * as sync from './src/execute-black-box.js'
import * as scenarioAlgorithms from './src/scenario-algorithm.js'
import utils from './src/utils.js'

import {Command} from "https://deno.land/x/cmd@v1.2.0/commander/index.ts"

const program = new Command()

program
    .requiredOption('-c, --config <config>', 'Config file in json format', value => value)
    .option('-w, --workingDirectory <workingDirectory>', 'Working directory')
    .option('-r, --replace <replace>', 'Replace tags. Example: tag1:=value,tag2:=value . No space in string')

program.on('-h, --help', () => {
    console.log('')
    console.log('Example calls:')
    console.log('  $ scenario-generate --config config.json')
    console.log('  $ scenario-generate -c config.json')

    console.log('  $ scenario-generate --config config.json --replace url:=http://localhost:8080/led/api/v1,valuDate:=2022-10-01')
    console.log('  $ scenario-generate -c config.json -r url:=http://localhost:8080/led/api/v1,valuDate:=2022-10-01')
    console.log('  $ scenario-generate -c config.json -w ./test-data -r url:=http://localhost:8080/led/api/v1,valuDate:=2022-10-01')
})

program.parse(process.argv)

utils.setWorkingDirectory(program.opts().workingDirectory || '.')

const input = utils.openFile(program.opts().config)

input.replace = {
    ...input.replace,
    ...utils.inputReplacesToJson(program.opts().replace)
}

const scenarioJson = scenarioAlgorithms.createScenarios(input)

sync.executeBlackBox(scenarioJson, 0)
    .then(data => {
        console.log(JSON.stringify(data, null, 2))
    })
    .catch(e => {
        console.log(e)
    })

