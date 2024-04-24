#!/bin/bash

echo "Checking git..."
if ! [ -x "$(command -v git)" ]; then
    echo 'Error: git is not installed.'
    exit 1
fi

echo "Checking node..."
if ! [ -x "$(command -v node)" ]; then
    echo 'Error: Node.js is not installed.'
    exit 1
fi
if [ "$(node -v | cut -d. -f1 | sed 's/[^0-9]*//g')" -lt 18 ]; then
    echo 'Error: Node.js version >= 18.0.0'
    exit 1
fi

git clone https://github.com/tuya/smart-wc.git

cd smart-wc
npm install

npm run dev --mock=true

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "cygwin" ]]; then
    cygstart http://localhost:3000
elif [[ "$OSTYPE" == "msys" ]]; then
    start http://localhost:3000
fi