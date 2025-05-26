import { useEffect, useState } from "react";
import { ConfigurationService } from "@/services/configuration/ConfigurationService";
import { getMainRuntime } from "@/services/runtime";
import { Runtime } from "effect/Runtime";
import * as Context from "effect/Context";
import { FullAppContext } from "@/services/runtime";

export function useConfigurationService(): ConfigurationService | null {
  const [configService, setConfigService] = useState<ConfigurationService | null>(null);

  useEffect(() => {
    try {
      const runtime: Runtime<FullAppContext> = getMainRuntime();
      const service = Context.get(runtime.context, ConfigurationService);
      setConfigService(service);
    } catch (error) {
      console.warn("ConfigurationService not available yet, will retry");
    }
  }, []);

  return configService;
}
