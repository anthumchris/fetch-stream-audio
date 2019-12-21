module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "babel-eslint",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        'semi': 2,
        'no-unused-vars': 0,
        'react/react-in-jsx-scope': 0,
        'react/no-unknown-property': 0,
        'react/prop-types': 0,
        'react/display-name': 0
    }
};