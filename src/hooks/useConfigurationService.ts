import { useEffect, useState } from "react";
import { ConfigurationService } from "@/services/configuration/ConfigurationService";
import { getMainRuntime } from "@/services/runtime";
import { Runtime } from "effect/Runtime";
import { FullAppContext } from "@/services/runtime";

export function useConfigurationService(): ConfigurationService {
  const [configService, setConfigService] = useState<ConfigurationService | null>(null);

  useEffect(() => {
    const runtime: Runtime<FullAppContext> = getMainRuntime();
    const service = runtime.context.get(ConfigurationService);
    setConfigService(service);
  }, []);

  if (!configService) {
    throw new Error("ConfigurationService not initialized");
  }

  return configService;
}
