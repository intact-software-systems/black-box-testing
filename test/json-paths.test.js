import {getAllValuePaths, loadJsonFile} from '../src/utils.js'

Deno.test('hello', async (_) => {

    const actual = await loadJsonFile('../test/actual-computed.json')
    const paths = getAllValuePaths(actual)

    console.log(paths)
})
