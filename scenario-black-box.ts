import utils from './src/utils.js'
import {BlackBox} from './src/black-box.js'
import {ScenarioAlgorithm} from "./src/scenario-algorithm.js";
import {ScenarioCommand} from "./src/scenario-command.js";

import {Command} from "https://deno.land/x/cmd@v1.2.0/commander/index.ts"

const program = new Command()

program
    .requiredOption('-c, --config <config>', 'Config file in json format', value => value)
    .option('-w, --workingDirectory <workingDirectory>', 'Working directory')
    .option('-r, --replace <replace>', 'Replace tags. Example: tag1:=value,tag2:=value . No space in string')
    .option('-e, --execution <execution>', 'Execution style dry or wet. Default is wet. -e dry|wet')

program.on('-h, --help', () => {
    console.log('')
    console.log('Example calls:')
    console.log('  $ scenario-generate --config config.json')
    console.log('  $ scenario-generate -c config.json')
    console.log('  $ scenario-generate -c config.json -e dry')

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

const scenarioJson = ScenarioCommand.create(input)

if (program.opts().execution && program.opts().execution.toLowerCase().includes('dry')) {
    console.log(JSON.stringify(scenarioJson, null, 2))
}
else {
    BlackBox.execute(scenarioJson.flatMap(a => a), 0, new Map())
        .then(data =>
            console.log(JSON.stringify(data, null, 2))
        )
        .catch(e =>
            console.log(e)
        )
}
