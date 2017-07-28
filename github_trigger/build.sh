#!/bin/bash

browserify --node deps.js > deps.bundle.js
uglifyjs -o deps.bundle.min.js deps.bundle.js
