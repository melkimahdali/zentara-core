import type { ZenRuntime } from "./runtime.js";
import { t } from "../i18n/index.js";

export interface ZenPlugin {
  name: string;
  setup(runtime: ZenRuntime): void | Promise<void>;
}

export function definePlugin(plugin: ZenPlugin): ZenPlugin {
  return plugin;
}

export class ZenPluginManager {
  private readonly loaded: string[] = [];

  constructor(private readonly runtime: ZenRuntime, private readonly plugins: ZenPlugin[]) {}

  async load(): Promise<void> {
    for (const plugin of this.plugins) {
      if (!plugin || typeof plugin.setup !== "function") {
        throw new Error(t().core.pluginInvalid(JSON.stringify(plugin?.name ?? plugin)));
      }
      await plugin.setup(this.runtime);
      this.loaded.push(plugin.name);
      this.runtime.logger.debug(`Plugin loaded: ${plugin.name}`);
    }
  }

  get names(): readonly string[] {
    return this.loaded;
  }
}
