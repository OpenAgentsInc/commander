# ProseMirror for React/Electron Development in 2025

The landscape of ProseMirror integration with React has fundamentally changed with the January 2025 fork of `@nytimes/react-prosemirror` to `@handlewithcare/react-prosemirror`. This shift represents a revolutionary approach to solving the long-standing incompatibilities between React and ProseMirror, making it an ideal time to adopt this technology stack for Electron applications.

## Understanding the breakthrough: Why the rebuild matters

Shane Moores' article reveals the core challenge that plagued React-ProseMirror integration for years: **state tearing**. Despite both libraries using virtual DOM concepts, their update cycles are fundamentally incompatible. React uses a two-phase update (render then commit), while ProseMirror updates and commits simultaneously. This mismatch caused subtle bugs where React components could access different versions of the editor state during rendering.

The solution in `@handlewithcare/react-prosemirror` v2+ completely rewrites ProseMirror's view layer as React components, eliminating the synchronization issues by making React the sole rendering engine. This approach, developed over five years at The New York Times and now battle-tested by over 1,000 journalists daily, provides unprecedented stability for React integration.

## Current package landscape and recommendations

### Primary recommendation: @handlewithcare/react-prosemirror

**Installation for React/Electron:**
```bash
npm install @handlewithcare/react-prosemirror@^2.3.5 \
  react@^19.1.0 react-dom@^19.1.0 react-reconciler@0.32.0 \
  prosemirror-view@1.39.2 prosemirror-state prosemirror-model \
  prosemirror-schema-basic prosemirror-commands prosemirror-keymap
```

**Basic implementation:**
```typescript
import { ProseMirror, ProseMirrorDoc, reactKeys } from "@handlewithcare/react-prosemirror";
import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";

function Editor() {
  const [state, setState] = useState(() =>
    EditorState.create({
      schema,
      plugins: [
        reactKeys(),
        keymap(baseKeymap)
      ]
    })
  );

  return (
    <ProseMirror
      state={state}
      dispatchTransaction={(tr) => setState(s => s.apply(tr))}
    >
      <ProseMirrorDoc />
    </ProseMirror>
  );
}
```

### Alternative approaches

**Tiptap** remains the most popular choice (1.3M weekly downloads) for developers wanting a higher-level abstraction with extensive pre-built extensions. Choose Tiptap if you need rapid development with less customization.

**Remirror** offers a React-first design with excellent TypeScript support and accessibility features. Consider it for projects requiring strong a11y compliance.

**BlockNote** excels for Notion-style block editors but may be too opinionated for custom implementations.

## Electron-specific implementation strategies

### Architecture for optimal performance

Research from production Electron apps like acreom reveals a critical pattern: **keep ProseMirror in the renderer process but offload heavy operations to the main process**. This architecture achieved 100x performance improvements in real applications.

**Webpack configuration for Electron:**
```javascript
// webpack.renderer.config.js
module.exports = {
  target: 'electron-renderer',
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: {
      // Use ESM builds for better tree-shaking
      'prosemirror-model': 'prosemirror-model/src/index.js'
    }
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        prosemirror: {
          test: /[\\/]node_modules[\\/]prosemirror/,
          name: 'prosemirror',
          chunks: 'all'
        }
      }
    }
  }
};
```

### Security with context isolation

Modern Electron apps require context isolation. Implement a secure bridge pattern:

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('editorAPI', {
  saveDocument: (content) => ipcRenderer.invoke('save-document', content),
  loadDocument: (path) => ipcRenderer.invoke('load-document', path),
  // Never expose the entire ProseMirror instance
});

// main.js
ipcMain.handle('save-document', async (event, content) => {
  // Heavy file operations happen here, not in renderer
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });

  if (!result.canceled) {
    await fs.writeFile(result.filePath, content);
  }
});
```

## Critical implementation patterns

### Custom node views with React components

The new library enables seamless React component integration:

```typescript
import { NodeViewComponentProps } from "@handlewithcare/react-prosemirror";

const ImageNodeView = memo(({ node, selected, getPos }: NodeViewComponentProps) => {
  const handleResize = useEditorEventCallback((view) => {
    const pos = getPos();
    if (typeof pos === 'number') {
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, null, {
          ...node.attrs,
          width: newWidth
        })
      );
    }
  });

  return (
    <img
      src={node.attrs.src}
      className={selected ? 'selected' : ''}
      onLoad={handleResize}
    />
  );
});

// Register in your editor setup
const nodeViews = {
  image: ImageNodeView
};
```

### Performance optimization for large documents

ProseMirror demonstrates excellent memory characteristics (stable 6-18 MB usage), but optimize further for Electron:

```typescript
// Implement viewport-based rendering for very long documents
const DocumentRenderer = ({ state }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });

  // Only render visible portions
  const visibleNodes = useMemo(() => {
    return state.doc.nodesBetween(
      visibleRange.start,
      visibleRange.end,
      (node, pos) => ({ node, pos })
    );
  }, [state.doc, visibleRange]);

  return <VirtualizedNodeList nodes={visibleNodes} />;
};
```

## Native Electron integration

### Enhanced spell checking

Native spell checking in Electron only highlights the focused word. Implement comprehensive checking:

```javascript
// Enable native spell check
const mainWindow = new BrowserWindow({
  webPreferences: {
    spellcheck: true,
    contextIsolation: true
  }
});

mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);

// Custom context menu with spell suggestions
mainWindow.webContents.on('context-menu', (event, params) => {
  const menu = new Menu();

  params.dictionarySuggestions.forEach(suggestion => {
    menu.append(new MenuItem({
      label: suggestion,
      click: () => mainWindow.webContents.replaceMisspelling(suggestion)
    }));
  });

  menu.popup();
});
```

## Common gotchas and solutions

### State synchronization issues

The fundamental state tearing problem is solved in v2+, but follow these patterns:

```typescript
// Always use the provided hooks
const view = useEditorViewContext();
const effect = useEditorEffect((view) => {
  // Safe DOM access after ProseMirror updates
}, [dependency]);

// Never directly manipulate the DOM
// ❌ Bad: editorElement.innerHTML = content
// ✅ Good: dispatch(state.tr.replaceWith(...))
```

### Bundle size considerations

A minimal ProseMirror setup adds ~200KB to your bundle. Optimize with:

1. Tree-shaking: Use ESM builds when possible
2. Code splitting: Load extensions on demand
3. Compression: Enable gzip/brotli in Electron

### Testing strategies

Implement comprehensive testing using jest-prosemirror:

```typescript
import { createEditor, doc, p } from "jest-prosemirror";

test("custom command works correctly", () => {
  createEditor(doc(p("Hello <cursor>World")))
    .command(myCustomCommand)
    .callback(({ state }) => {
      expect(state.doc).toEqualProsemirrorDocument(
        doc(p("Hello ", em("World")))
      );
    });
});
```

## Production deployment checklist

**Essential steps for Electron apps:**

1. **Version locking**: Pin exact ProseMirror versions to avoid compatibility issues
2. **Memory profiling**: Use Chrome DevTools to monitor for leaks during development
3. **Platform testing**: Test on Windows, macOS, and Linux for Electron-specific behaviors
4. **Performance monitoring**: Implement telemetry for editor operations
5. **Error boundaries**: Wrap the editor in React error boundaries for graceful degradation
6. **Auto-save implementation**: Leverage Electron's file system access for robust auto-saving

## Conclusion

The January 2025 fork to @handlewithcare/react-prosemirror represents a watershed moment for React-ProseMirror integration. By completely reimagining the integration architecture, it eliminates the fundamental incompatibilities that have plagued developers for years. For Electron applications, this provides an unprecedented opportunity to build sophisticated text editors with native-like performance and stability.

The key to success lies in understanding the architectural boundaries: let React handle all rendering through the new library, keep ProseMirror operations in the renderer process, and offload heavy computations to Electron's main process. With proper implementation of these patterns, you can build editors that rival native applications in both functionality and performance.
