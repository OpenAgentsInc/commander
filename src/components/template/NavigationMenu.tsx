import React from "react";
import { useTranslation } from "react-i18next";
import { usePaneStore } from "@/stores/pane";
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { Button } from "../ui/button";

export default function NavigationMenu() {
  const { t } = useTranslation();
  const openSecondPagePane = usePaneStore((state) => state.openSecondPagePane);

  return (
    <NavigationMenuBase className="text-muted-foreground px-2 font-mono">
      <NavigationMenuList>
        <NavigationMenuItem>
          {/* Home button can just reset HUD or do nothing for now */}
          <Button
            variant="ghost"
            className={navigationMenuTriggerStyle()}
            onClick={() => console.log("Home clicked")}
          >
            {t("titleHomePage")}
          </Button>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Button
            variant="ghost"
            className={navigationMenuTriggerStyle()}
            onClick={() => openSecondPagePane()}
          >
            {t("titleSecondPage")}
          </Button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenuBase>
  );
}
