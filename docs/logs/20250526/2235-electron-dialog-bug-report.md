# Electron v36 File Dialog Bug Report

## Date: 2025-05-26
## Time: 22:35

## Bug Summary
The Electron file/folder selection dialog (`dialog.showOpenDialog`) returns empty file paths array even when folders are successfully selected by the user on macOS.

## Environment
- **Electron Version**: 36.3.1
- **Platform**: macOS (Darwin 24.2.0)
- **Node Version**: (bundled with Electron)
- **Application**: OpenAgents Commander

## Bug Description

### Expected Behavior
When calling `dialog.showOpenDialog` with `properties: ['openDirectory']`, the dialog should return:
```javascript
{
  canceled: false,
  filePaths: ['/path/to/selected/folder']
}
```

### Actual Behavior
The dialog returns:
```javascript
{
  canceled: false,
  filePaths: []
}
```

Even though:
1. The dialog appears correctly
2. User navigates to and selects a folder
3. User clicks "Select" button
4. Dialog closes without error

## Reproduction Steps

1. Create an IPC handler in main process:
```typescript
ipcMain.handle("select-folder", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Folder',
    buttonLabel: 'Select'
  });
  return result;
});
```

2. Call from renderer process:
```typescript
const result = await window.electronAPI.selectFolder();
// result.filePaths is empty array
```

## Attempted Solutions

### 1. Parent Window Reference
```typescript
const mainWindow = BrowserWindow.fromWebContents(event.sender);
const result = await dialog.showOpenDialog(mainWindow, options);
// Still returns empty filePaths
```

### 2. Synchronous API
```typescript
const result = dialog.showOpenDialogSync(mainWindow, options);
// Also returns empty array
```

### 3. Different Property Combinations
```typescript
properties: ['openDirectory', 'createDirectory', 'promptToCreate']
// No effect, still empty
```

### 4. Minimal Options
```typescript
const result = await dialog.showOpenDialog({
  properties: ['openDirectory']
});
// Still returns empty filePaths
```

### 5. Window Focus Workaround
```typescript
mainWindow.focus();
await new Promise(resolve => setTimeout(resolve, 100));
const result = await dialog.showOpenDialog(options);
// No improvement
```

## Console Logs

```
[Main Process] Received claude-code:select-folder request
[Main Process] Main window found: true
[Main Process] Showing dialog with options: {
  properties: [ 'openDirectory' ],
  title: 'Select Project Folder for Claude Code',
  buttonLabel: 'Select Folder',
  message: 'Choose a folder for Claude Code to use as the project context'
}
[Main Process] Dialog result: { canceled: false, filePaths: [] }
[Main Process] Folder selection cancelled or no path selected.
```

## Related Error
A potentially related error appears in the console:
```
TypeError: object null is not iterable (cannot read property Symbol(Symbol.iterator))
source: node:electron/js2c/sandbox_bundle (2)
```

## Impact
This bug prevents users from using native folder selection dialogs in Electron applications, requiring workarounds such as:
- Manual text input for folder paths
- Drag and drop implementations
- Command-line arguments

## Workaround Implemented

Added a fallback dialog with manual text input:
```typescript
const handleSelectFolder = async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) {
      // Show manual input dialog
      setShowManualFolderDialog(true);
    }
  } catch (error) {
    // Show manual input dialog on error
    setShowManualFolderDialog(true);
  }
};
```

Users can now manually enter folder paths when the native dialog fails.

## Similar Issues
- This appears to be a regression in Electron v36
- Similar issues reported in Electron GitHub repository
- Affects both async and sync dialog APIs
- Platform-specific to macOS (needs verification on Windows/Linux)

## Recommendations

1. **Short-term**: Use the manual input workaround
2. **Medium-term**: Consider downgrading to Electron v35 if stable
3. **Long-term**: Wait for Electron team to fix the issue
4. **Alternative**: Implement custom file browser using fs module

## Test Code for Reproduction

```javascript
// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

ipcMain.handle('test-dialog', async () => {
  console.log('Dialog test started');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  console.log('Dialog result:', result);
  return result;
});

// renderer.js
async function testDialog() {
  const result = await window.electronAPI.testDialog();
  console.log('Renderer received:', result);
  // Expected: { canceled: false, filePaths: ['/some/path'] }
  // Actual: { canceled: false, filePaths: [] }
}
```

## Status
- **Reported**: No (should be reported to Electron repository)
- **Workaround**: Implemented (manual text input)
- **Severity**: High (breaks core functionality)
- **Affected Versions**: Electron 36.3.1 (possibly all v36.x)