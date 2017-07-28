#!/bin/bash -ex

mv node_modules node_modules.bak
npm install
browserify --node deps.js > deps.bundle.min.js
#uglifyjs -o deps.bundle.min.js deps.bundle.js
rm -r node_modules
mv node_modules.bak node_modules
