import { BBTToolCommandLineParser } from './cli/commandLine';
const parser: BBTToolCommandLineParser = new BBTToolCommandLineParser();

parser.execute().catch(console.error);
