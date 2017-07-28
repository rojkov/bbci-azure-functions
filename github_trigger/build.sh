#!/bin/bash

mv node_modules node_modules.bak
browserify --node deps.js > deps.bundle.js
uglifyjs -o deps.bundle.min.js deps.bundle.js
rm -r node_modules
mv node_modules.bak node_modules
