# Black-box-testing

Data-driven black-box testing of Rest APIs. No code to write, only json files.

Black box testing with bug locator assistant

Uses [Deno](https://deno.land) as runtime

## Repo is registed in Deno

Registered as [module](https://deno.land/add_module)

[Repository](https://github.com/intact-software-systems/black-box-testing) has webhook to push to deno.

To create a new release, push a new tag.

```shell
git tag -a v1.0.1 -m "Data-driven black box testing of Rest APis. No coding only json configurations."
git push origin v1.0.1
```

## Installation

Install command line script with [deno](https://deno.land/manual@v1.26.0/tools/script_installer)

```shell
deno install -f --allow-env --allow-read --allow-write --allow-net https://deno.land/x/black_box_testing@v1.0.1/scenario-black-box.ts
```

```text
-f overwrites existing installation
```

Follow advice to include to path deno bin folder to path, for example add to .bashrc:

```shell
export PATH="/Users/knut-helgevik/.deno/bin:$PATH"
```

Execute script

```shell
scenario-black-box -c config.json
```

## Test data spotify.json

If you have a spotify account you can register an [app](https://developer.spotify.com/dashboard/applications) and get access to Spotify's Rest API.

Then your app gets a clientId and a secret which you can create a Basic auth for:

```text
echo -n 'clientId:secret' | base64
```

You can use this to execute the test-data/spotify.json like so:

```shell
scenario-black-box --config ./test-data/spotify.json --replace basicAuth:=yourbase64encodedclientidsecret > spotify-results.json
```

Then you will start to interact with spotify.

If you wish to start to add testing of responses you can add response json in each HTTP. See interaction auth for an example.


