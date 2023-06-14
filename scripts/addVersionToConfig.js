const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const file = path.join(__dirname, '../lib/template/config.json');

function addVersion(version) {
  const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

  content.__version = version;

  fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

module.exports.run = () => addVersion(pkg.version);
