import chalk from 'chalk';

export function log(...msgs: string[]): void {
  console.log(...msgs);
}

export function warn(...msgs: string[]): void {
  console.log(...msgs.map(msg => chalk.yellow(msg)));
}

export function error(...msgs: string[]): void {
  console.log(...msgs.map(msg => chalk.red(msg)));
}
