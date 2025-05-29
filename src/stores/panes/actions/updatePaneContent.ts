import { SetPaneStore } from "../types";

export function updatePaneContentAction(set: SetPaneStore, id: string, content: any) {
  // Only log for coder panes to reduce noise
  if (id.startsWith('coder_pane_')) {
    console.log(`[coder_pa updatePaneContent] Updating pane ${id} with content:`, content);
  }
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