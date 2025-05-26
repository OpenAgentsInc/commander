import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "../pages/HomePage";

// In the refactored application, all routes have been converted to panes that render within the main HUD
// The only route we need is HomeRoute, which renders the main application layout

export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: HomePage,
});

export const rootTree = RootRoute.addChildren([HomeRoute]);
