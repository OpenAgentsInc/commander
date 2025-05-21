import React from "react";
import BaseLayout from "@/layouts/BaseLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const RootRoute = createRootRoute({
  component: Root,
});

function Root() {
  // The wallet initialization check has been moved to App.tsx
  // This component now simply renders the BaseLayout with the Outlet (which is always HomePage)
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
}
