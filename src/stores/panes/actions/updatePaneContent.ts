import { SetPaneStore } from "../types";

export function updatePaneContentAction(set: SetPaneStore, id: string, content: any) {
  set((state) => {
    const updatedPanes = state.panes.map((pane) => {
      if (pane.id === id) {
        return {
          ...pane,
          content: { ...pane.content, ...content }
        };
      }
      return pane;
    });

    return {
      panes: updatedPanes,
    };
  });
}