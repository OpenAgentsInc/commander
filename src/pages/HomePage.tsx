import React from "react";
export default function HomePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span>
          <h1 className="font-mono text-4xl font-bold">OpenAgents</h1>
          <p className="text-center text-lg uppercase text-muted-foreground" data-testid="pageTitle">
            Commander
          </p>
        </span>
        {/* <ToggleTheme /> */}
      </div>
    </div>
  );
}
