import "@/App";
import { mainRuntime } from '@/services/runtime';

// Log to confirm Effect runtime is initialized
if (mainRuntime) {
  console.log("Main Effect runtime has been referenced/initialized in renderer.");
} else {
  console.error("Main Effect runtime FAILED to initialize or is undefined in renderer.");
}