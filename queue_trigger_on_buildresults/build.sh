#!/bin/bash -ex

rm -rf node_modules node_modules.bak
npm install
browserify --node deps.js | sed 's/\r$//'  > deps.bundle.min.js
#uglifyjs -o deps.bundle.min.js deps.bundle.js
rm -r node_modules
