import {toRandomFromType} from '../src/type-generators.js'

Deno.test('date time test', async(_) => {

    const dateTime = toRandomFromType('dateTime', '2022-01-03', '2022-06-19', 10)

    console.log(dateTime)
})
