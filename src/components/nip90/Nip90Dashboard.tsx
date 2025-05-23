// src/components/nip90/Nip90Dashboard.tsx
import React from "react";
import Nip90RequestForm from "./Nip90RequestForm";
import Nip90EventList from "./Nip90EventList";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * NIP-90 Dashboard component that combines the request form and event list
 * for interacting with Data Vending Machines
 */
const Nip90Dashboard: React.FC = () => {
  return (
    <div className="flex h-full flex-col gap-4 p-2">
      <div className="flex-shrink-0">
        <Nip90RequestForm />
      </div>
      <div className="min-h-0 flex-grow">
        {" "}
        {/* min-h-0 allows ScrollArea to work in flex child */}
        <ScrollArea className="h-full">
          <Nip90EventList />
        </ScrollArea>
      </div>
    </div>
  );
};

export default Nip90Dashboard;
