const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const readRelative = path =>
  readFileSync(join(__dirname, path), 'utf8');

module.exports.contributions = function() {
  return JSON.parse(readRelative("resources/contributions.json"));
}
