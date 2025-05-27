import { SetState } from "../types";

export function updatePaneContentAction(set: SetState, id: string, content: any) {
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