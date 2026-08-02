module.exports = {
  "roots": [
    "<rootDir>/test"
  ],
  "coverageDirectory":"<rootDir>/test/cov",
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  // Generation output is the product here, so the generators are held to a
  // high line/statement bar. Branch/function bars sit lower: much of the
  // remaining branching is defensive fallbacks in yml emitters.
  "coverageThreshold": {
    "global": {
      "statements": 95,
      "lines": 95,
      "branches": 78,
      "functions": 85
    }
  }
}
