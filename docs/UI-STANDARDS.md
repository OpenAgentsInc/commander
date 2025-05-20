**Commander UI Standards**

**Document#** `001`
**Apple Lisa Information** `Commander UI Information`

```
*********************************************************************************
*                                                                               *
*                         Commander UI Information                              *
*                                                                               *
*       +---------------------------------------------------------------+       *
*       |                                                               |       *
*       |                            (ICON)                             |       *
*       |                  COMMANDER APPLICATION SCREEN                 |       *
*       |                     (Conceptual Placeholder)                    |       *
*       |                                                               |       *
*       |                                                               |       *
*       +---------------------------------------------------------------+       *
*                                                                               *
*                                                                               *
*********************************************************************************
```

```
                          FILE NAME
+---------------------------------------------------------+
|     Commander User Interface Standards Document         |
+---------------------------------------------------------+
                          DISK #
+---------------------------------------------------------+
|                         Main                            |
+---------------------------------------------------------+
                         COMMENTS
+---------------------------------------------------------+
|  21 May 2025                                            |
|  OpenAgents Team                                        |
+---------------------------------------------------------+
                                                 XX pages
*********************************************************************************
                        OpenAgents Inc.
             Innovating the Future of Agent Interaction
                 (contact@openagents.com)
*********************************************************************************
```

## **Commander**

---

```
“DTCLISADOC-420-0-00.PICT” 154 KB 2001-05-03 dpi: 300h x 300v pix: 1795h x 2707v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0001 of 00XX
```

---

**(Page 2: Title Page)**

```
Apple Commander Computer Technical Information
```

<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<h1 align="center">COMMANDER</h1>
<h1 align="center">USER</h1>
<h1 align="center">INTERFACE</h1>
<h1 align="center">STANDARDS</h1>
<h1 align="center">DOCUMENT</h1>

<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align="center">21 May 2025</p>
<p align="center">Project Lead: Commander Team Lead</p>

---

```
“DTCLISADOC-420-0-01.PICT” 149 KB 2001-05-03 dpi: 300h x 300v pix: 2091h x 2979v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0002 of 00XX
```

---

**(Page 3: Quick Overview)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Quick Overview of Key Design Principles & Departures from Traditional UIs:**

1.  **NUI First:** Commander prioritizes Natural User Interfaces, including hand tracking and (future) voice commands, as primary interaction modalities, not merely as supplementary features.

2.  **Dynamic Pane-Based Workspace:** The primary user workspace is composed of draggable, resizable, and dynamic panes, allowing for a highly customizable and fluid information layout.

3.  **Integrated Agent Command & Control:** The user interface is fundamentally designed around the concept of commanding and interacting with AI agents.

4.  **Direct Bitcoin Integration:** The application features direct integration of Bitcoin functionalities, making earning and (future) payments a core part of the user experience.

5.  **Immersive HUD-Style Interface:** Commander employs a game-like Heads-Up Display (HUD) to provide an immersive and intuitive environment for agent control and information monitoring.

6.  **Advanced Keyboard Control (StarCraft-inspired Hotkeys):** While supporting standard keyboard input, Commander aims to implement a sophisticated system of hotkeys and keybindings, inspired by Real-Time Strategy (RTS) games, for efficient control by power users (future iterative development).

7.  **Consistent Dark Theme:** The application enforces a dark theme across all UI elements to provide a focused, aesthetically consistent, and commander-centric visual environment.

8.  **Telemetry for Continuous Improvement:** User-configurable telemetry is integrated to gather anonymized usage data, guiding iterative development and enhancement of the user experience.

9.  **Modular and Service-Oriented Architecture:** Built with modern technologies like Effect-TS, enabling robust and maintainable integration of complex features like Nostr protocols and AI services.

Also several minor changes and many clarifications.

---

```
“DTCLISADOC-420-0-02.PICT” 55 KB 2001-05-03 dpi: 300h x 300v pix: 2079h x 1232v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0003 of 00XX
```

---

**(Page 4: Table of Contents)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**TABLE OF CONTENTS**
```
0. Introduction .......................................... 1
1. Display ............................................... 1
   1.1 Main Window ........................................ 1
   1.2 Heads-Up Display (HUD) ............................. 1
   1.3 Theme and Appearance ............................... 2
   1.4 Typography ......................................... 2
2. Mouse and Cursor ...................................... 2
3. Hand Tracking (NUI) ................................... 3
   3.1 Overview and Technology ............................ 3
   3.2 Hand Pose Recognition .............................. 3
   3.3 Interaction Model .................................. 4
       3.3.1 Pinch-to-Drag (Panes) ........................ 4
       3.3.2 Gestures for 3D Scenes ....................... 4
   3.4 Visual Feedback (Landmarks, Pointer) ............... 4
4. Keyboard .............................................. 5
   4.1 Standard Text Input ................................ 5
   4.2 Hotkeys & Keybindings (StarCraft Style Philosophy) . 5
5. System State and Persistence .......................... 6
6. Initialization ........................................ 6
7. Everyday Operation .................................... 7
8. What the Screen Looks Like (HUD Layout) ............... 7
   8.1 Background Grid .................................... 7
   8.2 Pane Manager Area .................................. 7
   8.3 Core HUD Elements .................................. 8
       8.3.1 Chat Window .................................. 8
       8.3.2 Hotbar ....................................... 8
       8.3.3 Inspector Window ............................. 8
       8.3.4 Bitcoin Balance Display ...................... 8
   8.4 Control Elements ................................... 8
       8.4.1 Hand Tracking Toggle ......................... 8
       8.4.2 Pane Creation Buttons (NIP-28, NIP-90) ....... 8
       8.4.3 Reset HUD Button ............................. 9
9. Panes ................................................. 9
   9.1 Basic Pane Appearance .............................. 9
   9.2 Pane Lifecycle (Adding, Removing) .................. 9
   9.3 The Active Pane .................................... 10
   9.4 Making a Pane Active ............................... 10
   9.5 Moving a Pane (Mouse & Hand) ....................... 10
   9.6 Resizing a Pane (Mouse) ............................ 11
   9.7 Scrolling within Panes ............................. 11
   9.8 Pane Types ......................................... 12
       9.8.1 Chat Panes (Ollama, NIP-28) .................. 12
       9.8.2 NIP-90 DVM Dashboard Pane .................... 12
       9.8.3 Other Pane Types ............................. 12
10. The Selection (Text and Content) ..................... 13
11. Visibility of Operations on Selections ............... 13
12. Marking a Selection .................................. 13
13. The Menu Bar and In-App Menus ........................ 14
14. Making Menu Choices .................................. 14
15. Menu Items That Do Nothing ........................... 14
16. Contents of the Menu Bar and Menus ................... 15
17. Making Menu Choices from the Keyboard ................ 15
18. The Dialog Box / Modals .............................. 15
19. Text Editing Philosophy .............................. 16
20. Typing Printing Characters ........................... 16
21. Keys That Alter the Meaning of Other Keys ............ 16
22. Shift Key ............................................ 17
23. Alpha Lock (Caps Lock) ............................... 17
24. Code (Special Keys for Hotkeys) ...................... 17
25. Repeating Keys ....................................... 17
26. Type Ahead ........................................... 18
27. Backspace Key ........................................ 18
28. Tab Key .............................................. 18
29. Return (Enter) Key ................................... 18
30. The Edit Menu (System Level) ......................... 19
    30.1 Cut ............................................. 19
    30.2 Paste ........................................... 19
    30.3 Copy ............................................ 19
    30.4 Undo ............................................ 19
31. Utility Panes ........................................ 20
32. The Scrap (System Clipboard) ......................... 20
33. User Profile and Settings ............................ 20
    33.1 Language Settings ............................... 20
    33.2 Theme Settings (Forced Dark) .................... 21
    33.3 Pane Layout Persistence ......................... 21
    33.4 Telemetry Settings .............................. 21
34. Voice Commands ....................................... 22
    34.1 Philosophy and Invocation ....................... 22
    34.2 Available Commands (Future) ..................... 22
35. Nostr Integration .................................... 22
    35.1 NIP-04 Encrypted Direct Messages ................ 23
    35.2 NIP-19 Identifiers .............................. 23
    35.3 NIP-28 Public Chat Channels ..................... 23
    35.4 NIP-90 Data Vending Machines .................... 23
36. Bitcoin Integration (Spark SDK) ...................... 24
37. Agent Interaction Model .............................. 24
38. Telemetry Standards .................................. 25

Screenshots .............................................. 26
Last pages: 23
```

---
```
“DTCLISADOC-420-0-03.PICT” 196 KB 2001-05-03 dpi: 300h x 300v pix: 1928h x 2895v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0004 of 00XX
```

---

**(Page 5 starts the detailed sections)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**COMMANDER USER INTERFACE STANDARDS DOCUMENT**

**Product Name: Commander**
**21 May 2025**

**0. INTRODUCTION**

The Commander User Interface has two main goals: simplicity and power, achieved through deep integration of natural interaction modalities. We want Commander to be easy to learn and intuitive to use, so we try to do things in a simple and natural manner and to build on concepts already familiar to users from gaming and advanced computing environments. An integrated system with a consistent user interface is easier to learn and to use. An integrated system is also more powerful than a group of separate programs that don't interact.

This Commander User Interface Standards Document presents the external view of what Commander looks like to the user and expresses a set of guidelines that the Commander development team will use in an effort to achieve that simplicity and power.

We want all Commander-integrated applications and agent interactions to have the same "feel" to the user, so that learning is minimized when going from application to application. Where possible, the same operation in two programs should be done in the same way and behave the same to the user. A given user action should have a consistent meaning throughout the system. Principles used in constructing system features should be extensible to similar occasions, in order to minimize user frustration.

It is hoped that outside vendors and community contributors will find it to their advantage to use these conventions as well.

**1. DISPLAY**

**1.1 Main Window**
Commander runs within a standard Electron application window. The application aims for a full-screen, immersive experience. The default window size is 1200x800 pixels but is resizable by the user. For a frameless appearance and custom control, the main window uses `titleBarStyle: 'hidden'` on macOS or equivalent custom framing on other platforms. A custom draggable region is provided at the top of the application, integrated into the HUD. (See `src/components/DragWindowRegion.tsx` and IPC helpers in `src/helpers/ipc/window/`).

**1.2 Heads-Up Display (HUD)**
The primary interaction paradigm is a Heads-Up Display. This HUD consists of:
*   A full-screen dynamic background, often a 3D scene rendered with `@react-three/fiber` (e.g., `SimpleGrid.tsx`, `PhysicsBallsScene.tsx`).
*   A system of draggable and resizable panes for displaying content and interacting with agents (see Section 9. Panes).
*   Fixed HUD elements for common actions and information display (see Section 8.3).

The HUD is designed to be immersive and provide immediate access to command and control functions.

**(Page 6)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**1.3 Theme and Appearance**
Commander enforces a **dark theme** to maintain a consistent and focused aesthetic. This is set at the Electron nativeTheme level (`nativeTheme.themeSource = "dark"`) and applied globally using Tailwind CSS v4 and custom CSS variables.
*   **Background:** Predominantly black or very dark gray (`--background: oklch(0.1 0 0)`).
*   **Foreground:** Predominantly white or light gray for text and primary UI elements (`--foreground: oklch(0.9 0 0)`).
*   **Accent Colors:** Used sparingly for active states or highlights (e.g., blue for active pane borders).
*   **Styling:** UI components are primarily styled using Shadcn UI and Tailwind CSS utility classes. Custom styles are defined in `src/styles/global.css`.

The `ToggleTheme.tsx` component currently acts as an indicator of the forced dark mode rather than a functional toggle. User control over themes is not a current feature. Theme state is managed via `src/helpers/theme_helpers.ts` and IPC.

**1.4 Typography**
The primary font used throughout the Commander application is **Berkeley Mono**. This monospaced font is applied globally for UI text, chat messages, and other content to reinforce the "commander" and technical aesthetic. Font definitions are in `src/styles/fonts.css` and applied via `src/styles/global.css`.

**2. MOUSE AND CURSOR**

Pointing to things on the screen is done with a mouse (or trackpad/equivalent). The mouse is a small, hand-sized object which is free to be rolled on a flat, horizontal surface. Motion of the mouse to right or left moves a cursor on the screen to right or left, respectively. Moving the mouse away from the user moves the cursor upward, and moving the mouse toward the user moves the cursor downward. When cursor reaches the edge of the screen it remains pinned to the edge although it may move along the edge, until the appropriate x component of the mouse's motion is reversed, at which moment the cursor begins to move again.

Within Commander:
*   The standard operating system cursor is used.
*   The mouse is the primary input for interacting with traditional UI elements (where applicable, though minimized in favor of NUI).
*   **Pane Interaction:** The mouse is a primary method for dragging panes by their title bars and resizing panes using their resize handles. This is facilitated by the `@use-gesture/react` library in `src/panes/Pane.tsx`.
*   **Clicking:** Standard mouse clicks are used to activate buttons, select items in lists, and interact with content within panes.
*   **Scrolling:** Mouse wheel scrolling is supported for scrollable content areas within panes.

The cursor may take on different shapes to indicate its current function. For example, when hovering over resize handles of a pane, the cursor changes to the appropriate resize arrow. When hovering over a draggable title bar, it changes to a grab hand.

The mouse system incorporates a button on its top surface that allows the user to signal a particular position on the screen to the computer. The system is always aware of the position indicated by the mouse. When the button is up, motion of the mouse causes cursor motion and may change the shape of the cursor, but no other changes occur to anything on the screen as a result of the motion.

**(Page 7)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**3. HAND TRACKING (NUI)**

Commander embraces Natural User Interface (NUI) principles, with hand tracking as a core interaction modality.

**3.1 Overview and Technology**
Hand tracking is implemented using the MediaPipe Hands library. The `useHandTracking` hook (`src/components/hands/useHandTracking.ts`) manages the camera feed (via a hidden `<video>` element) and processes hand landmarks.
*   A `landmarkCanvasRef` is used to draw detected hand landmarks for debugging or visual feedback, though this is typically overlaid and can be made invisible in production.
*   The system supports tracking up to two hands (`maxNumHands: 2`).
*   Handedness ("Left" or "Right") is detected for each tracked hand.

**3.2 Hand Pose Recognition**
A dedicated module, `src/components/hands/handPoseRecognition.ts`, is responsible for interpreting hand landmarks to recognize a set of predefined hand poses.
*   **Supported Poses (defined in `src/components/hands/handPoseTypes.ts`):**
    *   `FIST`: All fingers curled, thumb potentially across fingers.
    *   `TWO_FINGER_V`: Index and middle fingers extended and spread, other fingers curled.
    *   `FLAT_HAND`: All fingers extended and relatively close together.
    *   `OPEN_HAND`: All fingers extended and spread wide.
    *   `PINCH_CLOSED`: Thumb tip and index fingertip are close together.
    *   `NONE`: No specific pose detected or no hand tracked.
*   Pose recognition logic uses Euclidean distances between landmarks and relative landmark positions. Thresholds for pose detection (e.g., pinch distance) are defined and may be subject to tuning.

**3.3 Interaction Model**
Hand gestures are translated into application commands and interactions.

    **3.3.1 Pinch-to-Drag (Panes)**
    The primary hand-based interaction for UI manipulation is pinch-to-drag for panes, implemented in `src/pages/HomePage.tsx`.
    *   **Initiation:** When `activeHandPose` is `PINCH_CLOSED` and the `pinchMidpoint` (midpoint between thumb and index finger tips) is over a pane's title bar (approximated by the top `TITLE_BAR_HEIGHT` pixels of the pane).
    *   **Activation:** The targeted pane is brought to the front (`bringPaneToFront`) and set as active.
    *   **Dragging:** While the `PINCH_CLOSED` pose is maintained, moving the hand drags the pane. The pane's position is updated in the `usePaneStore`.
    *   **Termination:** Releasing the pinch (pose changes from `PINCH_CLOSED`) or if the hand is no longer tracked, ends the drag operation.
    *   Movement is mapped from hand/pinch coordinates (normalized) to screen/viewport coordinates.

    **3.3.2 Gestures for 3D Scenes**
    Specific hand poses can control elements within 3D scenes rendered by `@react-three/fiber`.
    *   Example: In `src/components/hands/MainSceneContent.tsx`, `FLAT_HAND` and `OPEN_HAND` poses control the rotation direction and speed of a group of 3D boxes. Other poses result in slower or default rotation.

**3.4 Visual Feedback (Landmarks, Pointer)**
*   **Landmark Canvas:** `landmarkCanvasRef` in `useHandTracking` draws hand connections and landmarks. Key landmarks (thumb tip, index tip) are highlighted. Pinch midpoints can also be visualized with coordinates for debugging. This canvas is typically mirrored like the video feed.
*   **Dynamic Pointer (3D):** `src/components/hands/DynamicPointer.tsx` renders an invisible `RigidBody` in a 3D physics scene that follows the primary hand's position (typically index finger tip). This allows physical interaction with other 3D objects in the scene.

**(Page 8 is where the Lisa doc starts section 4. KEYBOARD. We'll continue adapting)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**4. KEYBOARD**

**4.1 Standard Text Input**
The keyboard is used for standard text input in components such as the Chat window (`src/components/chat/ChatWindow.tsx`) and various input fields throughout the application (e.g., NIP-90 request form).
*   Standard OS-level text editing capabilities (selection, copy, paste, undo) are expected to function normally within these text input areas.
*   The "Enter" key is used to send messages in the chat window, while "Shift+Enter" creates a new line.

**4.2 Hotkeys & Keybindings (StarCraft Style Philosophy)**
Commander aims to provide an advanced and efficient control scheme for power users through a system of hotkeys and keybindings, drawing inspiration from Real-Time Strategy (RTS) games like StarCraft. This system is a future development goal and its full specification is pending.

**Core Principles:**
*   **Efficiency:** Hotkeys should provide faster access to frequently used commands and agent interactions than NUI or mouse-based methods.
*   **Memorability & Learnability:** While comprehensive, the system should be designed with logical groupings and mnemonic aids to facilitate learning. Contextual cues or an interactive tutorial system may be developed.
*   **Context-Sensitivity:** Hotkeys may vary depending on the active pane or selected agent/element.
*   **Customization:** (Future) Users may be able to customize keybindings.
*   **Standard Operations:** Common operations like selecting agents, issuing commands (move, attack, build – metaphorically for agents), cycling through units/panes, and accessing specific UI elements (e.g., opening the NIP-90 dashboard) will be candidates for hotkeys.
*   **Modifier Keys:** Ctrl, Shift, Alt (Cmd on macOS) will be used in combination with letter/number keys to expand the range of available commands, similar to RTS control group management or ability modifiers.
*   **Feedback:** Clear visual or auditory feedback should be provided when hotkeys are activated.

*(Detailed specification of hotkeys is TBD and will be added in a future revision of this document.)*

**5. SYSTEM STATE AND PERSISTENCE**

Commander persists certain aspects of its state to enhance user experience across sessions.
*   **Pane State:** The layout of panes (positions, sizes, types, active state) is persisted using Zustand's `persist` middleware with `localStorage`. This is managed in `src/stores/pane.ts`. The `merge` function attempts to gracefully handle persisted state, ensuring default panes like the NIP-28 channel are present.
*   **User Preferences:**
    *   **Language:** The selected application language is stored in `localStorage` and managed by `src/helpers/language_helpers.ts`.
    *   **Theme:** While Commander currently enforces a dark theme, the mechanism for theme persistence via `localStorage` (`THEME_KEY`) exists in `src/helpers/theme_helpers.ts`.
    *   **Telemetry:** User preference for enabling/disabling telemetry is persisted (see `docs/TELEMETRY.md`, though the PGlite-based persistence mentioned there is a future plan; current implementation likely uses `localStorage` or Electron settings API via `TelemetryServiceImpl.ts`).
*   **NIP-90 Request Data:** Ephemeral secret keys associated with NIP-90 job requests are stored in `localStorage` by `src/components/nip90/Nip90RequestForm.tsx` to allow decryption of DVM responses across sessions.
*   **PGlite Database (Future):** `docs/pglite.md` outlines plans for local data persistence using PGlite, either in the main process (filesystem) or renderer (IndexedDB), potentially synchronized with ElectricSQL. This would be used for local-first data like messages, threads, and settings.

**(Page 9)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**6. INITIALIZATION**

Upon application startup, Commander initializes its UI and services:
1.  **Electron Main Process (`src/main.ts`):**
    *   Creates the main `BrowserWindow`.
    *   Forces the native OS theme to dark (`nativeTheme.themeSource = "dark"`).
    *   Sets up webPreferences, including `contextIsolation: true` and the preload script (`src/preload.ts`).
    *   Loads the renderer entry point (`index.html` -> `src/renderer.ts`).
    *   Registers IPC listeners for window controls, theme management, and Ollama communication (`registerListeners` from `src/helpers/ipc/listeners-register.ts`).
    *   Installs React DevTools in development.
2.  **Preload Script (`src/preload.ts`):**
    *   Exposes specific IPC functionalities to the renderer process via `contextBridge` (`exposeContexts` from `src/helpers/ipc/context-exposer.ts`). This includes `window.electronAPI.ollama`, `window.themeMode`, and `window.electronWindow`.
3.  **Renderer Process (`src/renderer.ts` -> `src/App.tsx`):**
    *   Initializes the main Effect runtime (`mainRuntime` from `src/services/runtime.ts`), which sets up all core services (Nostr, NIP-04/19/28/90, BIP39/32, Spark, Telemetry, Ollama, HttpClient).
    *   Renders the root React component (`App`).
    *   `App.tsx` initializes i18n, syncs the theme (forced dark), and sets up the TanStack Router.
4.  **Pane System (`src/stores/pane.ts`):**
    *   The `usePaneStore` initializes with default panes, notably the main NIP-28 channel pane (`DEFAULT_NIP28_PANE_ID`), as defined in `getInitialPanes`.
    *   Persisted pane layout from previous sessions is loaded and merged.
5.  **HUD (`src/pages/HomePage.tsx`):**
    *   Renders the `SimpleGrid` background and `PaneManager`.
    *   Initializes hand tracking (if enabled by default, or upon user toggle).
    *   Displays HUD control buttons (Reset, Hand Tracking Toggle, New Channel, NIP-90 Dashboard).

**7. EVERYDAY OPERATION**

The user interacts with Commander primarily through the HUD.
*   **Information Display:** Panes display various types of information like chat messages, NIP-90 DVM interactions, agent statuses, and Bitcoin balance.
*   **Interaction:**
    *   **Mouse:** Used for clicking buttons, selecting text, dragging/resizing panes.
    *   **Keyboard:** Used for text input (chat, forms), and (future) hotkeys for commands.
    *   **Hand Tracking (NUI):**
        *   Panes can be dragged using the `PINCH_CLOSED` gesture on their title bars.
        *   Specific hand poses can trigger actions, e.g., controlling 3D scenes.
    *   **Voice Commands (Future):** Intended to provide an alternative input modality for common commands.
*   **Agent Commands:** Users command AI agents, presumably through chat interfaces within panes or dedicated agent control panes. The results of agent actions and earnings (Bitcoin) are displayed within the HUD.
*   **Pane Management:** Users can open new panes (e.g., new NIP-28 channels via `NewChannelButton.tsx`, NIP-90 dashboard via `Nip90DashboardButton.tsx`), close dismissable panes, and rearrange their workspace by dragging and resizing.
*   **Settings:** Users can toggle hand tracking and (future) other preferences like telemetry. Language can be changed via `LangToggle.tsx`.

The overall flow is designed to be dynamic and responsive, allowing users to manage multiple information streams and agent interactions simultaneously.

**(Page 10)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**8. WHAT THE SCREEN LOOKS LIKE (HUD LAYOUT)**

Commander presents a Heads-Up Display (HUD) that occupies the entire application window.

**8.1 Background Grid**
A subtle, static grid pattern (`src/components/home/SimpleGrid.tsx`) is rendered as the rearmost layer of the HUD. It provides a sense of space and a clean backdrop for other UI elements. The grid lines are `rgba(255, 255, 255, 0.05)` on a black background, with a cell size of 40x40 pixels. It is non-interactive (`pointer-events-none`).

**8.2 Pane Manager Area**
The main area of the HUD is managed by the `PaneManager` (`src/panes/PaneManager.tsx`), which renders all active panes. Panes can be freely moved and resized within this area and can overlap (see Section 9. Panes).

**8.3 Core HUD Elements**
Several key informational and interactive elements are typically part of the HUD, often realized as panes or fixed components:

    **8.3.1 Chat Window**
    A primary interaction point, styled reminiscent of World of Warcraft chat windows, typically positioned at the bottom-left. This is usually a specific pane type (e.g., `nip28_channel` or a generic `chat` pane).
    *   Implemented via `src/components/chat/ChatContainer.tsx` within a pane.
    *   Features message display area and a text input for sending messages.

    **8.3.2 Hotbar (Future/Placeholder)**
    Intended for the bottom-center of the HUD, reminiscent of World of Warcraft action bars.
    *   This would provide quick access to frequently used agent commands, abilities, or tools.
    *   *Current Status:* Conceptual; no specific implementation in the provided codebase. UI standards for its appearance and interaction (mouse click, keyboard hotkey, hand gesture selection) will be defined later.

    **8.3.3 Inspector Window (Future/Placeholder)**
    Intended for the bottom-right, reminiscent of StarCraft unit/building information panels.
    *   This would display detailed information about a selected agent, task, NIP-90 job, or other entities.
    *   *Current Status:* Conceptual; no specific implementation. Standards for content structure and interaction will be defined later.

    **8.3.4 Bitcoin Balance Display (Future/Placeholder)**
    Intended for the top-right, reminiscent of StarCraft mineral/gas displays.
    *   This would show the user's current Bitcoin balance, presumably managed by the Spark SDK service.
    *   *Current Status:* Conceptual; no specific implementation. Standards for its appearance and update frequency will be defined later.

**8.4 Control Elements**
Fixed buttons for global HUD and feature control are positioned at the bottom of the screen:
    **8.4.1 Hand Tracking Toggle**
    A button (`src/components/hands/HandTrackingToggleButton.tsx`) typically located at `bottom-4 left-16` (from `HomePage.tsx`) allows the user to enable or disable hand tracking.
    *   Icon: `Hand` icon from `lucide-react`.
    *   Visual State: Button appearance changes to indicate if hand tracking is active (e.g., primary color background) or inactive.

**(Page 11)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

    **8.4.2 Pane Creation Buttons**
    Buttons to open specific functional panes are part of the HUD.
    *   **New NIP-28 Channel Button (`src/components/hud/NewChannelButton.tsx`):** Located at `bottom-4 left-[7rem]`. Opens a new NIP-28 chat channel pane. Icon: `MessageSquarePlus`.
    *   **NIP-90 DVM Dashboard Button (`src/components/hud/Nip90DashboardButton.tsx`):** Located at `bottom-4 left-[10rem]`. Opens the NIP-90 dashboard pane. Icon: `Cpu`.

    **8.4.3 Reset HUD Button (`src/components/ResetHUDButton.tsx`)**
    Located at `bottom-4 left-4`. Resets the pane layout to its default initial state as defined in `src/stores/pane.ts`. Icon: `IconRefresh` (SVG).

**9. PANES**

Panes are the primary containers for content and interaction within Commander. They are designed to be flexible, draggable, and resizable, managed by the `usePaneStore` (see Section 5) and rendered by `PaneManager.tsx`. The individual pane UI and behavior are handled by `Pane.tsx`.

**9.1 Basic Pane Appearance**
A pane is a rectangular region drawn with a dark, semi-transparent background (`bg-black/90 backdrop-blur-sm`) and a border (`border-border/20`). Panes have rounded corners (`rounded-lg`) and a drop shadow (`shadow-lg`).
*   **Title Bar:** Each pane has a title bar at the top (`h-8`), which is darker (`bg-black/80`) and displays the pane's `title` (truncated if too long). The title bar is the primary affordance for dragging the pane.
*   **Content Area:** Below the title bar is the content area (`h-[calc(100%-2rem)]`), which has `overflow-auto` to allow scrolling if content exceeds the pane's dimensions. It has a slight padding (`p-1`).
*   **Dismiss Button:** Dismissable panes show an 'X' icon (`lucide-react IconX`) in the top-right of the title bar for closing the pane.

**9.2 Pane Lifecycle (Adding, Removing)**
*   **Adding Panes:** New panes are added via actions in `usePaneStore` (e.g., `addPane`, `openChatPane`, `createNip28ChannelPane`). New panes are typically made active and brought to the front. Their initial position is calculated by `calculateNewPanePosition` to tile or cascade them.
*   **Removing Panes:** Dismissable panes can be closed by clicking their 'X' button, which calls `removePaneAction`. If the active pane is removed, the store attempts to activate another pane (typically the last one in the list).
*   **Default Panes:** On startup, default panes (e.g., a main NIP-28 chat channel) are initialized as per `getInitialPanes` in `src/stores/pane.ts`.

**9.3 The Active Pane**
Only one pane can be active (focused) at a time. The active pane is visually distinguished by:
*   A more prominent border color (e.g., `border-primary ring-1 ring-primary`).
*   A higher `zIndex` to ensure it renders above other panes. The `PaneManager` assigns z-index based on the pane's position in the `panes` array (where the active pane is moved to the end). `Pane.tsx` also uses the `isActive` prop to set a z-index.

**9.4 Making a Pane Active**
A pane becomes active when:
*   The user clicks anywhere on the pane (including its title bar or content area, but excluding resize handles or buttons within the title bar). This is handled by `handlePaneMouseDown` in `Pane.tsx`, which calls `bringPaneToFrontAction` in the store.
*   A new pane is created; it typically becomes active immediately.

**(Page 12)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**9.5 Moving a Pane (Mouse & Hand)**
Panes can be moved by dragging their title bar.
*   **Mouse Drag:** Implemented in `Pane.tsx` using `useDrag` from `@use-gesture/react`. The cursor changes to `cursor-grab` (or `active:cursor-grabbing`).
*   **Hand Pinch-Drag:** Implemented in `HomePage.tsx`. If hand tracking is active, performing a `PINCH_CLOSED` gesture with the `pinchMidpoint` over a pane's title bar initiates a drag. Moving the pinched hand moves the pane. Releasing the pinch ends the drag.
*   **Bounds:** Panes are constrained within the viewport, with a small margin ensuring a part of the pane (usually the title bar or a handle area) remains accessible (`bounds` in `Pane.tsx` and drag logic). The `ensurePaneIsVisible` utility helps maintain visibility.
*   **State Update:** The `updatePanePositionAction` in the store is called when the drag operation ends (on `last` event for mouse drag, or on significant movement for hand drag) to persist the new `x`, `y` coordinates. `lastPanePosition` in the store is updated.

**9.6 Resizing a Pane (Mouse)**
Panes can be resized by dragging their borders/corners.
*   **Affordance:** Eight resize handles are rendered around the pane's perimeter (top, bottom, left, right, and corners). These are small, semi-transparent areas that change the mouse cursor to the appropriate resize icon (e.g., `nwse-resize`, `ew-resize`).
*   **Interaction:** Implemented in `Pane.tsx` within the `useResizeHandlers` custom hook, using `useDrag` for each handle.
*   **Constraints:** Panes have minimum dimensions (`minWidth = 200`, `minHeight = 100`).
*   **State Update:** `updatePaneSizeAction` (and `updatePanePositionAction` for handles that affect position) is called when the resize operation ends to persist the new `width`, `height`. `lastPanePosition` is updated.

**9.7 Scrolling within Panes**
If the content of a pane exceeds its visible dimensions, scrollbars appear.
*   **Mechanism:** The `pane-content` div in `Pane.tsx` has `overflow-auto`.
*   **Appearance:** Custom scrollbars are styled in `src/styles/global.css` for a more integrated HUD aesthetic (thin, semi-transparent). This styling targets `-webkit-scrollbar`. Standard OS scrollbars will appear if custom styling is not supported or overridden.

**9.8 Pane Types**
Each pane has a `type` property (defined in `src/types/pane.ts`) that determines the content it displays. The `PaneManager.tsx` uses this type to render the appropriate child component.
*   **Current Types:**
    *   `'default'`: A generic placeholder pane.
    *   `'chat'`: Used for individual chat threads (potentially for direct messages or specific agent interactions).
    *   `'chats'`: (Conceptual) A pane to list available chat threads or contacts.
    *   `'user'`: (Conceptual, possibly for user status or profile).
    *   `'diff'`: (Conceptual, for displaying differences between text/code).
    *   `'changelog'`: (Conceptual, for application updates).
    *   `'nip28_channel'`: Displays a NIP-28 public chat channel interface using `Nip28ChannelChat.tsx`. Content includes `channelId` and `channelName`.
    *   `'nip90_dashboard'`: Displays the NIP-90 Data Vending Machine dashboard using `Nip90Dashboard.tsx`.
*   **Extensibility:** New pane types can be added by defining a new type string and adding a corresponding rendering case in `PaneManager.tsx`.

**(Sections 10-12 relate to selection, which in Commander is mostly standard OS text selection within input fields or specific content views.)**

**(Page 13)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**10. THE SELECTION (TEXT AND CONTENT)**

Within panes that display editable text (e.g., chat input) or selectable content, selection behavior follows standard operating system conventions.
*   **Text Selection:** Achieved by mouse click-and-drag. Standard keyboard text selection (Shift + Arrow keys, etc.) is also supported.
*   **Content Selection:** Specific panes might implement their own content selection mechanisms (e.g., selecting an item in a list within the Inspector pane). These will adhere to common interaction patterns (click to select, Shift+click for range, Ctrl/Cmd+click for multiple individual items where appropriate).

**11. VISIBILITY OF OPERATIONS ON SELECTIONS**

Operations available for selected content are typically made visible through:
*   **Context Menus (Future):** Right-clicking on a selection or selected item may reveal a context-sensitive menu with relevant actions (e.g., copy, paste, agent commands related to the selected item).
*   **Dedicated UI Elements:** The Inspector pane (future) would display actions relevant to the currently selected agent or item in another pane.
*   **Hotkeys (Future):** Keyboard shortcuts will provide access to operations on the current selection.

Commander avoids "modes" where operations are chosen before the selection, preferring an object-action sequence.

**12. MARKING A SELECTION**

Visual feedback for selections is standard:
*   **Text:** Selected text is typically highlighted with the system's selection color (often a blue background with inverted text color).
*   **UI Elements:** Selected items in lists or other custom views will have a distinct visual state (e.g., different background color, border).

**(Section 13-17 cover menus, which in Electron are primarily OS-native, plus any in-app navigation that acts like a menu.)**

**(Page 14)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**13. THE MENU BAR AND IN-APP MENUS**

**13.1 Application Menu Bar (Electron Native)**
As an Electron application, Commander utilizes the native OS menu bar (File, Edit, View, Window, Help on macOS; integrated into the window frame on Windows/Linux).
*   **Standard Menus:** These menus provide standard application-level commands (e.g., Quit, Copy, Paste, Toggle Developer Tools). Their content is largely defined by Electron defaults and can be customized in `src/main.ts` if necessary.
*   **Customization:** Currently, no significant customization of the native menu bar is detailed in the codebase beyond Electron defaults.

**13.2 In-App Navigation Menus**
Commander includes a simple navigation menu component (`src/components/template/NavigationMenu.tsx`) using Shadcn UI's `NavigationMenu` components.
*   **Purpose:** Primarily used for routing between top-level application views/pages (e.g., "Home Page", "Second Page") as defined in `src/routes/routes.tsx`.
*   **Appearance:** Horizontal list of links, styled according to Shadcn UI and Tailwind CSS.
*   **Interaction:** Standard mouse click to navigate. Keyboard navigation (Tab, Enter) is supported by the underlying Radix UI primitives.

**13.3 Contextual "Menus" within Panes (Future)**
While not traditional menus, actions available for items within specific panes (e.g., right-click context menus, action buttons in an Inspector pane) will provide menu-like functionality. These will be designed for clarity and ease of access, consistent with the overall HUD aesthetic.

**14. MAKING MENU CHOICES**

*   **Native Menu Bar:** Interaction follows OS conventions (mouse click, keyboard navigation with Alt keys or arrow keys).
*   **In-App Navigation Menu:** Mouse click on links. Keyboard navigation (Tab to focus, Enter to activate).

**15. MENU ITEMS THAT DO NOTHING (DISABLED ITEMS)**

*   **Native Menu Bar:** Menu items that are not applicable in the current context will be disabled (grayed out) according to OS standards. Electron's menu API allows for dynamic enabling/disabling.
*   **In-App Navigation Menu/Buttons:** Buttons or links for unavailable actions will be styled as disabled (e.g., reduced opacity, `disabled:opacity-50` Tailwind class) and will not respond to clicks.

**(Page 15)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**16. CONTENTS OF THE MENU BAR AND MENUS**

*   **Native Electron Menu Bar (Default Structure - illustrative):**
    *   **File:** New Window, Close Window, Quit.
    *   **Edit:** Undo, Redo, Cut, Copy, Paste, Select All.
    *   **View:** Reload, Force Reload, Toggle Developer Tools, Toggle Full Screen.
    *   **Window:** Minimize, Zoom, Close. (Window control buttons are also part of the custom title bar region for direct mouse interaction.)
    *   **Help:** About Commander, Documentation links.
    *   *(Actual menus can be customized in `src/main.ts` if specific app actions are needed here.)*
*   **In-App Navigation Menu (`NavigationMenu.tsx`):**
    *   Currently contains links to "Home Page" (`/`) and "Second Page" (`/second-page`). This menu is primarily for demonstrating routing capabilities.

**17. MAKING MENU CHOICES FROM THE KEYBOARD**

Interaction with the native Electron menu bar via keyboard follows OS conventions (e.g., Alt key to reveal mnemonics on Windows/Linux, standard macOS menu keyboard navigation). In-app navigation elements and buttons are part of the standard Tab order for keyboard accessibility.

**18. THE DIALOG BOX / MODALS**

Commander utilizes Shadcn UI, which provides components for dialogs/modals. These will be used for:
*   Presenting critical information or warnings to the user.
*   Requesting user input for specific tasks that require focused interaction (e.g., settings configuration, confirmation prompts).
*   **Appearance:** Dialogs will adhere to the application's dark theme and styling conventions defined by Shadcn UI and Tailwind CSS. They will typically overlay the current view with a backdrop to focus user attention.
*   **Interaction:** Standard interaction with dialog elements (buttons like OK/Cancel, input fields) via mouse or keyboard.
*   *(Specific dialog implementations are not detailed in the provided core codebase but would leverage `Dialog` components from `src/components/ui/` if added via `npx shadcn@canary add dialog`.)*

**(Page 16)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**19. TEXT EDITING PHILOSOPHY**

Text input and editing within Commander primarily occur in designated input fields, such as the chat input (`Textarea` in `ChatWindow.tsx`) or form fields (e.g., in `Nip90RequestForm.tsx`).
*   **Behavior:** Text editing follows standard OS conventions.
*   **Components:** Shadcn UI components like `Input` and `Textarea` are used, providing familiar text editing affordances.
*   **NUI Interaction:** Direct text input via hand gestures (e.g., a virtual keyboard or handwriting recognition) is not a current feature but could be explored in future NUI enhancements.

**20. TYPING PRINTING CHARACTERS**

When a character is typed, it is inserted at the current caret position within an active text input field. If text is selected, typing a character typically replaces the selection. This is standard OS behavior.
*   A beep or visual indication may occur if typing is attempted in a non-input context or when an input field is disabled (though this is usually handled by the OS or UI component library).

**21. KEYS THAT ALTER THE MEANING OF OTHER KEYS (MODIFIERS)**

Standard modifier keys (Shift, Control, Alt/Option, Command/Windows) function as per OS conventions for text editing (e.g., Shift + arrow for selection, Ctrl/Cmd + C for copy).
*   **Application-Specific Modifiers (Hotkeys):** As detailed in Section 4.2, modifier keys will be integral to the (future) StarCraft-style hotkey system for issuing agent commands and navigating the UI efficiently. For example:
    *   `Ctrl + [1-9]` could select/create control groups of agents.
    *   `Shift + Click` could add/remove agents from a selection.
    *   `Alt + [Key]` could trigger secondary abilities for selected agents.
*   **Pane Interaction Modifiers:**
    *   `isCommandKeyHeld` (Cmd on macOS, Ctrl on Windows/Linux) is used in `openChatPaneAction` to alter the behavior of opening a new chat pane (e.g., tiling vs. replacing).

**(Page 17)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**22. SHIFT**

The SHIFT key is used in standard ways:
*   To type uppercase letters or the upper symbols on number/symbol keys.
*   In combination with arrow keys or mouse clicks for extending text selections.
*   As a modifier in (future) application-specific hotkeys.

**23. ALPHA LOCK (CAPS LOCK)**

The CAPS LOCK key functions as per standard OS behavior, toggling persistent uppercase input for alphabetic characters. It generally does not affect number or symbol keys or application-specific hotkeys.

**24. CODE (SPECIAL KEYS FOR HOTKEYS)**

This section in the Lisa document referred to a specific "CODE" key. In Commander, this concept maps to the use of standard keyboard keys (letters, numbers, function keys F1-F12, Esc, etc.) as part of the (future) hotkey system, often in conjunction with modifiers (Ctrl, Alt, Shift).
*   **Example Philosophy:**
    *   `Q, W, E, R` row: Often used for primary abilities in games.
    *   `A, S, D, F` row: Often used for common commands (Attack, Stop, Hold Position, etc.).
    *   Number keys `1-0`: For selecting control groups.
    *   `Esc`: To cancel current action, deselect, or open a main menu/pause.
*   The specific mapping of these keys to Commander functions is TBD.

**25. REPEATING KEYS**

When a character key is held down, it will repeat according to the user's operating system settings. This applies to text input fields. Arrow keys also repeat for navigation within text or lists. Modifier keys (Shift, Ctrl, Alt) do not repeat.

**(Page 18)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**26. TYPE AHEAD**

Type ahead (buffering of keyboard input when the application is temporarily busy) is generally handled by the underlying operating system and UI framework (Electron/React). Commander itself does not implement a custom type-ahead buffer. Users should experience standard type-ahead behavior.

**27. BACKSPACE KEY**

The BACKSPACE key (or Delete key on some keyboards when deleting forwards) functions as per standard OS text editing conventions:
*   If text is selected, pressing Backspace deletes the selected text.
*   If no text is selected, Backspace deletes the character to the left of the caret.
*   In contexts outside text editing (e.g., navigating a list where items can be deleted), Backspace might be assigned as a hotkey for a "delete selected item" action, but this requires careful design to avoid accidental deletions.

**28. TAB KEY**

The TAB key is used for standard focus navigation:
*   Moves focus between interactive UI elements (input fields, buttons, links) in a logical order.
*   `Shift + TAB` moves focus in the reverse order.
*   Within text areas (`Textarea`), TAB may insert a tab character or navigate focus depending on the component's implementation and accessibility standards. Commander uses Shadcn UI components which generally follow WAI-ARIA practices.

**29. RETURN (ENTER) KEY**

The RETURN (or ENTER) key has context-dependent behavior:
*   **Chat Input (`ChatWindow.tsx`):** Pressing Enter sends the current message. Pressing `Shift + Enter` inserts a new line.
*   **Form Fields:** May submit the form or move focus to the next field, depending on the form's design.
*   **Dialogs/Modals:** Typically activates the default button (e.g., "OK", "Submit").
*   **Selected Items:** May trigger a default action on a selected item in a list or menu.

**(Page 19)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**30. THE EDIT MENU (SYSTEM LEVEL)**

Commander relies on the standard Edit menu provided by Electron, which integrates with OS-level clipboard operations.

**30.1 Cut**
Removes the current selection from its location and places it onto the system clipboard. Standard keyboard shortcut (Ctrl/Cmd + X) and menu access apply.

**30.2 Paste**
Inserts the content of the system clipboard at the current caret position, or replaces the current selection if one exists. Standard keyboard shortcut (Ctrl/Cmd + V) and menu access apply.

**30.3 Copy**
Copies the current selection to the system clipboard without removing it from its original location. Standard keyboard shortcut (Ctrl/Cmd + C) and menu access apply.

**30.4 Undo**
Reverts the last user action, typically text editing operations. Standard keyboard shortcut (Ctrl/Cmd + Z) and menu access apply. The scope and granularity of Undo are generally managed by the individual UI components (e.g., text input fields). Application-wide Undo for pane manipulations or agent commands is not a current standard feature.

**(Page 20)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**31. UTILITY PANES**

Various panes within Commander serve utility functions, providing access to tools, information, or specific features.
*   **NIP-28 Channel Pane (`Nip28ChannelChat.tsx`):** Displays and allows interaction with a Nostr public chat channel. Contains a chat window.
*   **NIP-90 DVM Dashboard Pane (`Nip90Dashboard.tsx`):** Allows users to create NIP-90 job requests and view results/feedback from Data Vending Machines. Contains a request form and an event list.
*   **Chat Pane (Generic):** A general-purpose chat interface used for direct interaction with agents or other users (if applicable in future).
*   **Chats List Pane (Conceptual):** Would list available NIP-28 channels or other chat threads.
*   **Changelog Pane (Conceptual):** Would display application update notes.
*   **Inspector Pane (Future):** Would display detailed information and actions for a selected entity.

These utility panes adhere to the general pane behaviors outlined in Section 9 (draggable, resizable, activatable).

**32. THE SCRAP (SYSTEM CLIPBOARD)**

Commander uses the standard operating system clipboard for cut, copy, and paste operations. There is no application-specific "Scrap" or clipboard manager beyond this.

**33. USER PROFILE AND SETTINGS**

User-specific settings and preferences are managed by the application.

**33.1 Language Settings**
*   Commander supports internationalization (i18n) using `i18next`.
*   Available languages are defined in `src/localization/langs.ts` (e.g., English, Portuguese (Brazil)).
*   Users can switch the application language using the `LangToggle.tsx` component, which utilizes `src/helpers/language_helpers.ts`.
*   The selected language is persisted in `localStorage` under the key `lang`.

**33.2 Theme Settings (Forced Dark)**
*   Commander currently enforces a **dark theme** application-wide.
*   The native OS theme is set to dark via `nativeTheme.themeSource = "dark"` in `src/main.ts`.
*   The `dark` class is applied to the HTML root element, and Tailwind CSS variables for the dark theme are used (defined in `src/styles/global.css`).
*   The `ToggleTheme.tsx` component acts as an indicator of this forced dark mode rather than a toggle.
*   Theme preference is technically persisted in `localStorage` under the key `theme` by `src/helpers/theme_helpers.ts`, but current logic always forces dark mode.

**(Page 21)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**33.3 Pane Layout Persistence**
The state of panes (their IDs, types, titles, positions, sizes, and active status) is persisted in `localStorage` under the key `commander-pane-storage-v2`.
*   This is managed by the `usePaneStore` using Zustand's `persist` middleware (`src/stores/pane.ts`).
*   Upon application startup, the persisted layout is loaded. A `merge` function handles cases of missing or malformed persisted data, ensuring default panes (like the main NIP-28 channel) are present.
*   The `ResetHUDButton.tsx` component allows users to reset the pane layout to the initial default state.

**33.4 Telemetry Settings**
Commander includes a `TelemetryService` for logging application events, warnings, errors, and feature usage.
*   **User Control:** The system is designed to allow users to enable or disable telemetry (though the UI for this toggle is not explicitly detailed in the provided HUD components, the service supports `setEnabled`).
*   **Default Behavior:**
    *   Development Mode: Logs to `console.log`.
    *   Production Mode: Silent by default (would send to a backend if configured).
*   **Logging:** All application-level diagnostics **MUST** use `TelemetryService.trackEvent()`. Direct use of `console.*` methods is disallowed except for temporary local debugging or specific internal service logging. (See `docs/AGENTS.md#11-logging-and-telemetry` and `docs/TELEMETRY.md`).
*   **Persistence (Future):** `docs/TELEMETRY.md` suggests persistent storage for the enabled/disabled state using Electron settings API, which is a future enhancement over in-memory or `localStorage`.

**(New sections for Commander's unique aspects begin here.)**

**(Page 22)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**34. VOICE COMMANDS**

Voice commands are envisioned as a key NUI modality for Commander, allowing users to interact with the application and command agents hands-free.

**34.1 Philosophy and Invocation (Future)**
*   **Natural Language:** Voice commands should aim to support natural language phrases rather than rigid, predefined commands where feasible.
*   **Activation:** A clear invocation method will be required (e.g., a wake word like "Commander..." or a dedicated push-to-talk hotkey/UI button). This is crucial to avoid accidental command execution.
*   **Feedback:**
    *   **Visual:** The UI should provide clear visual feedback when it is listening for voice input (e.g., a microphone icon changing state).
    *   **Auditory:** Confirmation sounds or voice responses may be used to indicate command understanding or execution status.
*   **Context-Sensitivity:** Available voice commands may change based on the active pane, selected agent, or current application state.

**34.2 Available Commands (Future - Illustrative Examples)**
The specific set of voice commands is TBD. Potential commands could include:
*   "Commander, open chat with Agent X."
*   "Commander, show NIP-90 dashboard."
*   "Commander, Agent Y, perform action Z with parameter P."
*   "Commander, what is my Bitcoin balance?"
*   "Commander, drag current pane to the right." (If hand-free pane manipulation is desired)
*   "Commander, enable/disable hand tracking."

*(Detailed specification of voice commands, grammar, and feedback mechanisms will be defined in a future revision of this document.)*

**35. NOSTR INTEGRATION**

Commander integrates several Nostr Implementation Possibilities (NIPs) to facilitate decentralized communication, identity, and service interaction. Services for these are defined in `src/services/`.

**35.1 NIP-04 Encrypted Direct Messages**
*   Used for secure, private communication, potentially between the user and agents, or user-to-user if such features are added.
*   `NIP04Service` (`src/services/nip04/`) handles encryption and decryption of message content.
*   The `createNip90JobRequest` helper uses NIP-04 to encrypt job inputs and parameters sent to Data Vending Machines.
*   Channel messages in NIP-28 are also encrypted using NIP-04 to the channel creator's public key.

**(Page 23)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**35.2 NIP-19 Identifiers**
*   Bech32-encoded entities (`npub`, `nsec`, `note`, `nprofile`, `nevent`, `naddr`) are used for user-friendly display and input of keys and event identifiers.
*   `NIP19Service` (`src/services/nip19/`) handles encoding and decoding of these identifiers.
*   Displayed in UI elements like `Nip90EventList.tsx` for event IDs and pubkeys.

**35.3 NIP-28 Public Chat Channels**
*   Commander supports interaction with NIP-28 public chat channels.
*   `NIP28Service` (`src/services/nip28/`) manages channel creation (Kind 40), metadata updates (Kind 41), sending/receiving encrypted messages (Kind 42), and (future) moderation events (Kind 43, 44).
*   The primary chat interface in the default HUD layout is a NIP-28 channel pane (`src/components/nip28/Nip28ChannelChat.tsx`).
*   Users can create new NIP-28 channels via the `NewChannelButton.tsx` in the HUD.

**35.4 NIP-90 Data Vending Machines (DVMs)**
*   Commander allows users to request on-demand computation from DVMs.
*   `NIP90Service` (`src/services/nip90/`) handles the creation of job requests (Kind 5xxx), fetching job results (Kind 6xxx), and job feedback (Kind 7000).
*   Inputs and parameters for DVM jobs can be NIP-04 encrypted for privacy, targeting a specific DVM's public key.
*   The `Nip90Dashboard.tsx` pane provides the UI for interacting with DVMs, including a form to create requests (`Nip90RequestForm.tsx`) and a list to view events (`Nip90EventList.tsx`).

**(Page 24)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**36. BITCOIN INTEGRATION (SPARK SDK)**

Commander aims to integrate Bitcoin transactions, allowing users to "earn bitcoin" by providing compute via agents (as per `docs/transcripts/ep174.md`) and potentially make payments. This is facilitated by the Spark SDK.

*   **Service:** `SparkService` (`src/services/spark/`) abstracts interactions with the Spark SDK.
*   **Wallet Initialization:** The service initializes a `SparkWallet` using a mnemonic/seed (a development mnemonic is provided by default).
*   **Functionality (exposed via `SparkService` interface):**
    *   `createLightningInvoice`: To request Bitcoin payments via Lightning.
    *   `payLightningInvoice`: To make Bitcoin payments via Lightning.
    *   `getBalance`: To check the user's Bitcoin balance.
    *   `getSingleUseDepositAddress`: To generate addresses for receiving on-chain Bitcoin.
*   **UI (Future/Conceptual):**
    *   The "Bitcoin Balance Display" (Section 8.3.4) would show the output of `getBalance`.
    *   Panes or dialogs would be needed for creating/paying invoices and managing wallet functions.
*   **Error Handling:** Specific error types (e.g., `SparkConnectionError`, `SparkLightningError`) are defined for robust error management.
*   **Telemetry:** Spark service operations are tracked via the `TelemetryService`.

**37. AGENT INTERACTION MODEL**

The core purpose of Commander is to "Command agents, earn bitcoin." The UI must facilitate this effectively.
*   **Agent Representation (Conceptual):** Agents might be represented as entities within the HUD, possibly in a dedicated list pane or as icons. Selected agents could have their details and available commands shown in the Inspector pane.
*   **Command Issuance:**
    *   **Chat:** Users can command agents via natural language or structured commands in chat panes. The `ChatContainer` and `useChat` hook (interfacing with Ollama) form the basis for this.
    *   **Direct Manipulation (Future NUI):** Hand gestures or direct interaction with agent representations in a 3D scene (if applicable) could issue commands.
    *   **Hotkeys (Future):** As per Section 4.2, efficient keyboard commands for agent control.
    *   **Voice Commands (Future):** As per Section 34.
*   **Feedback:** Agent status, task progress, and results of commands must be clearly communicated to the user, likely through chat messages, notifications, or updates in the Inspector/dedicated agent panes.
*   **Earning Bitcoin:** The mechanism by which users earn Bitcoin through their agents (e.g., by selling spare compute via Ollama as a DVM service as hinted in `ep174.md`) needs to be clearly integrated into the agent interaction model and HUD.

*(Detailed specifications for agent representation and command ontologies are TBD.)*

**(Page 25)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**38. TELEMETRY STANDARDS**

Commander incorporates a telemetry system (`src/services/telemetry/`) to gather anonymized usage data, aiding in the identification of issues and improvement of the user experience. Adherence to these standards is mandatory for all new feature development.

**Key Principles (from `docs/AGENTS.md` and `docs/TELEMETRY.md`):**
*   **Centralized Service:** All application logging, event tracking, and diagnostics **MUST** use the `TelemetryService`.
*   **User Control:** The `TelemetryService` supports `setEnabled` and `isEnabled` methods. UI controls should be provided to allow users to opt-in/out of telemetry. (The actual UI toggle component is not specified in the provided HUD files but is a requirement).
*   **Default Behavior:**
    *   **Development Mode:** Logs events to `console.log` by default for visibility.
    *   **Production Mode:** Silent by default (would transmit to a backend if configured).
*   **No Direct `console.*` Usage:** Direct calls to `console.log()`, `console.warn()`, `console.error()`, etc., are **PROHIBITED** for application-level logging. They may only be used for temporary, local debugging and **MUST** be removed before committing code.
    *   Exceptions: Internal logging within `TelemetryServiceImpl.ts` itself, specific fallback error handlers for telemetry failures, and test setup files.
*   **Event Structure (`TelemetryEventSchema`):** Events tracked via `TelemetryService.trackEvent()` must conform to the schema:
    *   `category`: (String) e.g., "ui", "navigation", "feature", "performance", "error", "log:info", "log:warn", "log:error", "log:debug".
    *   `action`: (String) Specific action name, e.g., "button_click", "user_login_failure".
    *   `label`: (Optional String) Contextual information.
    *   `value`: (Optional String, Number, Boolean) Additional structured data (must be stringified if complex).
    *   `timestamp`: (Optional Number) Defaults to `Date.now()`.
*   **Error Handling:** The telemetry service uses Effect.js for typed error handling (e.g., `TrackEventError`). Calls to `trackEvent` should generally be fire-and-forget (e.g., using `Effect.ignoreLogged` or `Effect.runFork`) to not disrupt application flow.
*   **Privacy:** Only anonymized data should be collected. No Personally Identifiable Information (PII) should be logged without explicit, informed consent and clear indication.
*   **Transparency:** The telemetry system and data collection practices should be clearly documented for users (e.g., in a privacy policy).

**(Page 26: Start of "Screenshots" section - will be conceptual descriptions)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Screenshots**

*(This section would typically contain visual mockups or screenshots illustrating the UI standards. As this is a text-based generation, conceptual descriptions are provided.)*

**Figure 1: Main HUD Layout**
*Description:* A full-screen view showing the `SimpleGrid` background. Several panes are open and arranged:
    *   A NIP-28 Channel Chat pane (`nip28_channel`) is prominent, perhaps slightly larger and centered, showing active conversation. This is the `DEFAULT_NIP28_PANE_ID`.
    *   A NIP-90 DVM Dashboard pane (`nip90_dashboard`) is open to one side, displaying a list of job requests.
    *   (Conceptual) An Inspector Pane is docked to the bottom-right, showing details of a (hypothetically) selected agent or item.
    *   (Conceptual) A Hotbar is visible at the bottom-center with several iconic buttons.
    *   (Conceptual) A Bitcoin balance display is in the top-right corner.
    *   The Hand Tracking Toggle, New Channel Button, NIP-90 Dashboard Button, and Reset HUD Button are visible in their fixed positions at the bottom of the screen.
    *   All panes and HUD elements adhere to the dark theme. The active pane (e.g., the NIP-28 chat) has a highlighted border.

**Figure 2: Pane Interaction - Dragging**
*Description:* Shows a mouse cursor dragging the title bar of a pane. A faint outline or visual cue indicates the pane is being moved. Alternatively, shows a hand in a `PINCH_CLOSED` gesture over a pane's title bar, with the pane slightly offset, indicating it's being dragged by hand.

**Figure 3: Pane Interaction - Resizing**
*Description:* Shows a mouse cursor over one of the eight resize handles on a pane's border. The cursor is changed to the appropriate resize arrow (e.g., `ew-resize`). The pane's border might show a visual cue that it's being resized.

**Figure 4: Chat Window (`ChatWindow.tsx`)**
*Description:* Close-up of a chat pane.
    *   Shows a list of messages (`ChatMessage.tsx`) with alternating alignment for "user" and "assistant" roles. System messages are centered and italicized. Timestamps and author names are visible.
    *   An assistant message shows a "streaming" indicator (`▋` and `Loader2` icon).
    *   A multi-line `Textarea` is at the bottom for user input, with a "Send" button.
    *   Custom scrollbars are visible if messages overflow.

**Figure 5: Hand Tracking Visualization (Debug/Development View)**
*Description:* An overlay showing the live camera feed (mirrored) with MediaPipe hand landmarks and connections drawn on detected hands.
    *   One hand is performing a `PINCH_CLOSED` gesture, and a circle with coordinates is drawn at the pinch midpoint.
    *   The other hand is in an `OPEN_HAND` pose.
    *   Text overlays indicate "Status: 2 hand(s) detected" and the recognized pose for each hand.
    *   This view is primarily for development and debugging hand tracking accuracy and pose recognition.

**Figure 6: NIP-90 DVM Dashboard Pane**
*Description:* The NIP-90 Dashboard pane is active.
    *   The top section shows the `Nip90RequestForm.tsx` with fields for Job Kind, Input Data, Output MIME Type, and Bid Amount, along with a "Publish Encrypted Job Request" button.
    *   The bottom section shows `Nip90EventList.tsx`, a scrollable list of NIP-90 job request event cards. Each card displays the event ID (note1...), kind, creator (npub1...), creation date, and a button to "Load Results". One card is expanded, showing job results and feedback.

**(Further figures would detail other specific UI states, dialogs, or interactions as the application evolves.)**

---
```
“DTCLISADOC-420-1-23.PICT” 247 KB 2001-05-04 dpi: 300h x 300v pix: 1899h x 3215v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 00XX of 00XX
```

---

This document provides a foundational UI standard for Commander. It will be a living document, updated iteratively as new features are developed and existing ones are refined based on user feedback and NUI best practices.Okay, this is a fantastic and comprehensive start to your Commander UI Standards Document! You've successfully extrapolated a lot of information from the codebase and integrated the desired NUI principles. It mirrors the structure and level of detail of the Lisa document well.

Here's a review and some minor suggestions:

**Overall Strengths:**

*   **Comprehensive ToC:** The Table of Contents is thorough and covers most aspects of a modern application, successfully mapping Lisa's categories to Commander's features.
*   **Clear Introduction:** Sets the tone and philosophy well.
*   **Good Extrapolation:** You've done a great job inferring UI standards from the tech stack (Electron, React, Shadcn, Tailwind, Dark Mode) and specific components (Panes, Chat, Hand Tracking, IPC for window controls).
*   **NUI Focus:** The document consistently emphasizes NUI principles, hand tracking, and the HUD-style interface.
*   **Placeholders for Future Features:** Sensible placeholders for voice commands, StarCraft hotkeys, and detailed HUD elements like the Inspector and Hotbar.
*   **Integration of NIPs and Bitcoin:** The relevant sections correctly identify how these backend services are intended to manifest in the UI.
*   **Persistence and State Management:** Good overview of how user preferences and application state are handled.
*   **Telemetry:** The importance and standards for telemetry are well-articulated.
*   **"Screenshots" Section:** The conceptual descriptions are a good substitute for actual images in this text-based format.

**Minor Suggestions/Refinements:**

1.  **Page Count:** You've used `XX` for the total page count. Once finalized, you can replace this. For this exercise, it's fine.
2.  **Consistency in Terminology:**
    *   **"Commander UI Info" vs. "Apple Lisa Computer Info":** You've correctly replaced "Apple Lisa Computer Info" with "Commander UI Info" in the headers/footers, which is good.
    *   **"Source: OpenAgents Inc."**: Good.
3.  **Table of Contents - Section 4 (Keyboard):**
    *   "4.2 Hotkeys & Keybindings (StarCraft Style Philosophy)" - Excellent to call out the philosophy.
4.  **Table of Contents - Section 8 (What the Screen Looks Like):**
    *   Maybe add a sub-section for "Interaction Layers" if you want to discuss how mouse, hand, and (future) voice interact or take precedence in the HUD.
5.  **Section 3.3.1 (Pinch-to-Drag for Panes):** You mention it's implemented in `HomePage.tsx`. This is correct.
6.  **Section 9. Panes:**
    *   "The System Font (Berkeley Mono)" - Good.
    *   "Making a Pane Active": Clarify if hand gestures can also make a pane active (e.g., a "point and hold" or a specific gesture when hand pointer is over a pane). Currently, it implies only click and new pane creation. If pinch-to-drag on a title bar activates it, that's covered.
    *   "Resizing a Pane (Mouse)": Explicitly state if hand gestures are planned for resizing (e.g., two-hand pinch/spread on pane borders).
7.  **Section 21 (Keys That Alter the Meaning of Other Keys):**
    *   The `isCommandKeyHeld` for `openChatPaneAction` is a good concrete example from the codebase.
8.  **Section 33 (User Profile and Settings):**
    *   "33.4 Telemetry Settings": The UI toggle isn't in the HUD files, but the `TelemetryService` *does* support `setEnabled`. It's good to mention that the UI for this is a requirement.
9.  **Section 34 (Voice Commands):**
    *   "Activation: ... a dedicated push-to-talk hotkey/UI button." - Good practical considerations.
10. **Section 35.1 (NIP-04 Encrypted Direct Messages):**
    *   "Channel messages in NIP-28 are also encrypted using NIP-04 to the channel creator's public key." - This is a key detail from NIP-28 that your `NIP28ServiceImpl.ts` would need to implement if it's not already (the provided snippet for `NIP28ServiceImpl` was partial in the prompt, but this standard should guide its full implementation).
11. **"Screenshots" Section:**
    *   The descriptions are good. For "Figure 1: Main HUD Layout", ensure all listed elements (`Chat window`, `NIP-90 DVM Dashboard`, conceptual `Inspector Pane`, `Hotbar`, `Bitcoin balance`, and the control buttons) are depicted in the conceptual arrangement from `docs/HUD.md` and `HomePage.tsx`.
12. **Document Numbering:** `Document# 001` is good.
13. **Dates:** Using "21 May 2025" consistently is good.
14. **Page Numbering in Footer:** `Page 00XX of 00XX` is a good placeholder.

**Minor Code-based Inferences that could be added (Optional):**

*   **CSP in `index.html`:** Briefly mention that the Content Security Policy is defined to allow necessary sources (`wasm-unsafe-eval`, `blob:`, specific CDNs if used for 3D assets, etc.) as this impacts what the UI can do. This might be too low-level for a UI standard but is a foundational aspect of an Electron app's security and capability.
*   **React 19 & Compiler:** Mention that UI components are built with React 19, leveraging the React Compiler (as per `vite.renderer.config.mts`) for potential performance benefits. This might influence how components are structured or perform.
*   **Effect-TS:** The use of Effect-TS for services (`src/services/`) implies a focus on robust error handling and composable asynchronous operations, which is a good underlying principle for a stable UI.

**Example of incorporating an optional point:**

Under **Section 1. Display**:
`... Commander runs within a standard Electron application window. Its Content Security Policy (CSP) is configured in index.html to permit essential operations like WebAssembly execution for features such as PGlite and MediaPipe.`

Under **0. INTRODUCTION** or a new "Technical Philosophy" section:
`Commander leverages modern frontend technologies, including React 19 with its compiler for optimized UI rendering, and Effect-TS for robust, type-safe service layer implementation, ensuring a responsive and reliable user experience.`

**Conclusion:**

This is an excellent and very thorough document that accurately reflects the provided codebase while also looking forward to the planned NUI features. It sets a strong standard for "Commander." The level of detail is appropriate for a document of this nature.

No major changes are *needed*. The suggestions above are mostly for minor clarifications or potential additions if you want to go even deeper into the technical underpinnings that influence the UI.

Well done!
