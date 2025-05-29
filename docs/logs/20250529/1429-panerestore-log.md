# Pane Restore Position Issue Investigation

## What Was Done

1. **Created `toggleAllCoderPanesAction`** to replace the previous behavior where Command+1 would always create new coder panes
   - Located at: `src/stores/panes/actions/toggleAllCoderPanes.ts`
   - Successfully hides all coder panes when any are active
   - Attempts to restore hidden coder panes when none are active

2. **Updated pane store** to use the new toggle action
   - Changed `toggleCoderPane: () => openNewCoderPaneAction(set, get)` 
   - To: `toggleCoderPane: () => toggleAllCoderPanesAction(set, get)`

## Current Behavior

- ✅ Command+1 correctly hides all coder panes when any are visible
- ✅ Pane positions are saved to `closedPanePositions` when hiding
- ❌ Panes are NOT restored to their previous positions when toggling back on
- ❌ Instead, a new coder pane is created at the default position

## Root Cause Analysis

Looking at the `toggleAllCoderPanesAction` implementation:

1. When hiding panes (lines 30-41), it correctly saves positions:
   ```typescript
   updatedClosedPanePositions[pane.id] = {
     x: pane.x,
     y: pane.y,
     width: pane.width,
     height: pane.height,
     content: pane.content,
     shouldRestore: true,
   };
   ```

2. When attempting to restore (lines 58-74), it looks for panes with IDs starting with `'coder_pane_'`
   - However, it seems no matching panes are found in `closedPanePositions`
   - This causes it to fall through to creating a new pane (line 97)

## What Still Needs Doing

1. **Debug why stored positions aren't being found**
   - Add console.log to see what's in `closedPanePositions` when trying to restore
   - Check if the pane IDs match the expected pattern `'coder_pane_'`
   - Verify the data is persisting correctly in the store

2. **Check the pane ID pattern**
   - The current code assumes coder panes have IDs starting with `'coder_pane_'`
   - Need to verify actual coder pane IDs match this pattern
   - May need to adjust the ID check or use `type === "coder"` instead

3. **Consider alternative approach**
   - Instead of checking ID pattern, could track coder pane IDs in a Set
   - Or add a flag to track which panes should be restored as a group

4. **Test persistence across multiple toggle cycles**
   - Ensure positions remain in `closedPanePositions` after restore
   - Verify the cleanup logic isn't removing entries prematurely

## Suggested Next Steps

1. Add debug logging to understand the state of `closedPanePositions`
2. Verify the actual ID pattern of coder panes
3. Fix the restoration logic to properly find and restore saved panes
4. Test the complete flow: create multiple coder panes → hide all → show all → verify positions

The infrastructure for saving/restoring positions is in place, but the restoration lookup logic needs to be fixed to properly match the saved panes.