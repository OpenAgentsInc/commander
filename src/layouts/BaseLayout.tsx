import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DragWindowRegion title=" " />
      {/* <NavigationMenu /> */}
      <main className="h-screen p-2">{children}</main>
    </>
  );
}
