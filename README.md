# Black-box-testing

Data-driven black-box testing of Rest APIs. No code to write, only json files.

Black box testing with bug locator assistant

Uses [Deno](https://deno.land) as runtime

## Installation

Install command line script with deno

```shell
deno install --allow-env --allow-read --allow-write --allow-net https://deno.land/x/black_box_testing@v0.9.0/scenario-black-box.ts
```

Follow advice to include to path deno bin folder to path, for example add to .bashrc:

```shell
export PATH="/Users/knut-helgevik/.deno/bin:$PATH"
```

Execute script

```shell
scenario-black-box -c config.json
```

