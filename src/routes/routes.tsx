import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "../pages/HomePage";
import { CoderView } from "@/components/coder";

// In the refactored application, all routes have been converted to panes that render within the main HUD
// The only route we need is HomeRoute, which renders the main application layout

export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: HomePage,
});

// New Coder Mode Route
export const CoderRoute = createRoute({
  getParentRoute: () => RootRoute, // Assumes Coder Mode uses the BaseLayout for window dragging
  path: "/coder",
  component: CoderView,
});

export const rootTree = RootRoute.addChildren([
  HomeRoute,
  CoderRoute, // Add the new route
]);
