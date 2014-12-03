# [json](http://json.org)-compile

[![npm version](https://badge.fury.io/js/json-compile.svg)](http://badge.fury.io/js/json-compile)
[![Build Status](https://travis-ci.org/gobwas/json-compile.svg?branch=master)](https://travis-ci.org/gobwas/json-compile)

> Compiles references in given json file into single structure

## Overview

Its about simple inheritance of json configs in your applications. It simply finds out all `$ref` keys inside given file
and replaces them with referenced values. First will be replaced outer references (to outer files), second - inner references
(in started with `#` symbol).

## Example

Imagine you have base config and his extension.

```js
// inside /dir/base/extension.json
{
    "$ref": "../base.json",
    "host": "127.0.0.1",
    "port": "8080"
}

// inside /dir/base.json
{
    "name": "json-compile"
}
```

Inside your program you could get compiled config with `json-compile` module:

```js
// inside your program
var compile = require("json-compile"),
    path    = require("path");

compile(path.resolve(__dirname, "./dir/base/extension.json"), function(err, config) {
    console.log(typeof config); // object
    console.log(config); // { "host": "127.0.0.1", "port": "8080", "name": "json-compile" }
});
```

## API

### compile(file, [options], [callback])

#### file

Type: `String`

Path to input json. Could be absolute, or relative. If relative - then `basedir` property in options must be set.

#### options

Type: `Object`

Options.


Property     | Necessary | Type       | Description
-------------|-----------|------------|---------------------
[basedir]    | no        | `string`   | Path to directory, where to find for relatively given path.
[loader]     | no        | `Function` | Loader for output references. Default uses `fs` module. Has signature `(path, callback)`, where callback is `callback(err, contents)`
[merge]      | no        | `boolean`  | Merge or not properties, if they are `Object`. Default to `true`.

#### callback

Has signature `(err, result)` where `err` could be a `null` or instance of `Error`, and result is an `Object` with compiled json.