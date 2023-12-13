import { IBBTProjectConfig, safeRun } from '../utils';
import { CheckNullValuePlugin } from './checkNullValue.plugin';
import { RemoveNullValueKeyPlugin } from './removeNullValue.plugin';

type Plugin = Partial<Exclude<IBBTProjectConfig['plugins'], undefined>>;

type Hooks = Exclude<Required<Plugin['hooks']>, undefined>;
type HookNames = keyof Hooks;
type HookParameters<T extends HookNames> = Parameters<Hooks[T]>;

class Plugins {
  private list: Plugin[] = [];

  registry(plugin: Plugin): () => void {
    this.list.push(plugin);

    return () => this.list.filter(p => p === plugin);
  }

  runHooks<T extends HookNames>(name: T, ...args: HookParameters<T>): void {
    for (const p of this.list) {
      if (p.hooks?.[name]) {
        safeRun(() => p.hooks![name]!.apply(null, args));
      }
    }
  }
}

export const BBTPlugins = new Plugins();

BBTPlugins.registry(CheckNullValuePlugin);
BBTPlugins.registry(RemoveNullValueKeyPlugin);
