import { describe, it, expect, vi } from "vitest";
import { openCodingCommandPaneAction } from "@/stores/panes/actions/openCodingCommandPane";
import { 
  CODING_COMMAND_PANE_ID,
  CODING_COMMAND_PANE_TITLE,
  CODING_COMMAND_PANE_DEFAULT_WIDTH,
  CODING_COMMAND_PANE_DEFAULT_HEIGHT
} from "@/stores/panes/constants";

// Mock the addPane module
vi.mock("@/stores/panes/actions/addPane", () => ({
  addPaneActionLogic: vi.fn((state) => state),
}));

import { addPaneActionLogic } from "@/stores/panes/actions/addPane";

describe("openCodingCommandPaneAction", () => {
  it("should call addPaneActionLogic with correct parameters", () => {
    // Mock the set function
    const mockSet = vi.fn();
    
    // Call the action
    openCodingCommandPaneAction(mockSet);
    
    // Verify set was called
    expect(mockSet).toHaveBeenCalledTimes(1);
    
    // Get the function passed to set
    const setFunction = mockSet.mock.calls[0][0];
    
    // Create a mock state
    const mockState = {
      panes: [],
      activePaneId: null,
      lastPanePosition: null,
    };
    
    // Execute the function
    setFunction(mockState);
    
    // Verify addPaneActionLogic was called with correct parameters
    expect(addPaneActionLogic).toHaveBeenCalledWith(
      mockState,
      {
        id: CODING_COMMAND_PANE_ID,
        type: "coding_command",
        title: CODING_COMMAND_PANE_TITLE,
        dismissable: true,
        width: CODING_COMMAND_PANE_DEFAULT_WIDTH,
        height: CODING_COMMAND_PANE_DEFAULT_HEIGHT,
      },
      true // tile positioning
    );
  });
});