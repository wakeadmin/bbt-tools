const { migrate } = require('./migration');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 通过 postinstall 进行运行
 * 因此 process.cwd() 会是 xxxx/node_modules/@wakeadmin/bbt-tools 我们需要切到xxxx/ 下
 */

const basePath = path.resolve(process.cwd(), '../../../');
const configPath = path.resolve(basePath, './bbt.config.js');

if (fs.existsSync(configPath)) {
  const pkg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const currentVersion = pkg.__version;

  migrate(currentVersion, configPath, basePath);
} else {
  console.log(chalk.rgb(143, 139, 232)('更新失败: 无法找到配置文件'));
}
