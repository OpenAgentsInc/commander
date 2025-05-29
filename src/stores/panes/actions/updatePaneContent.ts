import { SetPaneStore } from "../types";

export function updatePaneContentAction(set: SetPaneStore, id: string, content: any) {
  // Silently update pane content
  set((state) => {
    const updatedPanes = state.panes.map((pane) => {
      if (pane.id === id) {
        const updatedPane = {
          ...pane,
          content: { ...pane.content, ...content }
        };
        // Also update title if provided in content
        if (content.title) {
          updatedPane.title = content.title;
        }
        return updatedPane;
      }
      return pane;
    });

    return {
      panes: updatedPanes,
    };
  });
}