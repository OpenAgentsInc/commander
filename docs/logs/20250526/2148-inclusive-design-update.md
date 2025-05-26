Okay, I've updated the relevant sections of your Commander UI Standards Document to incorporate accessibility and inclusive design principles.

Here are the updated sections:

---

**Commander UI Standards**

**Document#** `001`

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
|  OpenAgents Team - Accessibility Update                 |
+---------------------------------------------------------+
                                                 30 pages
*********************************************************************************
                        OpenAgents Inc.
             Innovating the Future of Agent Interaction
      (contact@openagents.com) - Committed to Accessibility
*********************************************************************************
```

## **Commander**

---

```
“DTCCOMMDOC-420-0-00.PICT” 154 KB 2001-05-03 dpi: 300h x 300v pix: 1795h x 2707v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0001 of 0030
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
“DTCCOMMDOC-420-0-01.PICT” 149 KB 2001-05-03 dpi: 300h x 300v pix: 2091h x 2979v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0002 of 0030
```

---

**(Page 3: Quick Overview)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Quick Overview of Key Design Principles & Departures from Traditional UIs:**

1.  **NUI First, Inclusive by Design:** Commander prioritizes Natural User Interfaces (hand tracking, future voice commands) as primary interaction modalities, while ensuring robust alternative input methods (keyboard, mouse) for full accessibility.

2.  **Dynamic Pane-Based Workspace:** The primary user workspace is composed of draggable, resizable, and dynamic panes, allowing for a highly customizable and fluid information layout, manageable via keyboard and other assistive technologies.

3.  **Integrated Agent Command & Control:** The user interface is fundamentally designed around the concept of commanding and interacting with AI agents, with clear and accessible feedback mechanisms.

4.  **Direct Bitcoin Integration:** The application features direct integration of Bitcoin functionalities, making earning and (future) payments a core part of the user experience, with accessible transaction information.

5.  **Immersive & Perceivable HUD-Style Interface:** Commander employs a game-like Heads-Up Display (HUD) providing an immersive environment, designed with clear information hierarchy, sufficient contrast, and perceivable feedback for agent control and monitoring.

6.  **Advanced & Accessible Keyboard Control:** Commander implements comprehensive keyboard support, including standard navigation and a sophisticated system of hotkeys (StarCraft-inspired), ensuring all functionality is operable via keyboard for efficiency and accessibility.

7.  **Consistent Dark Theme with Accessibility Focus:** The application enforces a dark theme with carefully chosen color palettes ensuring sufficient contrast ratios (aiming for WCAG AA). Future iterations will explore user-configurable high-contrast modes and other visual accessibility options.

8.  **Telemetry for Continuous Improvement:** User-configurable telemetry is integrated to gather anonymized usage data, guiding iterative development and enhancement of the user experience, with a strong emphasis on privacy.

9.  **Modular and Service-Oriented Architecture:** Built with modern technologies like Effect-TS, enabling robust and maintainable integration of complex features like Nostr protocols and AI services.

10. **Commitment to Accessibility Standards:** Commander is designed and developed with a commitment to accessibility, aiming to meet or exceed Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, ensuring usability for people with diverse abilities. (See Section 39)

Also several minor changes and many clarifications.

---

```
“DTCCOMMDOC-420-0-02.PICT” 55 KB 2001-05-03 dpi: 300h x 300v pix: 2079h x 1232v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0003 of 0030
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
   3.5 Accessibility Considerations for NUI ............... 4
4. Keyboard .............................................. 5
   4.1 Standard Text Input ................................ 5
   4.2 Hotkeys & Keybindings (StarCraft Style Philosophy) . 5
   4.3 Keyboard Navigation and Interaction Standards ...... 5
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
   9.5 Moving a Pane (Mouse, Hand, Keyboard) .............. 10
   9.6 Resizing a Pane (Mouse, Keyboard) .................. 11
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
    33.5 Accessibility Settings (Future) ................. 21
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
39. Accessibility and Inclusivity Standards ............ 26
    39.1 Core Principles (WCAG) ........................ 26
    39.2 Keyboard Accessibility ........................ 26
    39.3 Screen Reader Support (ARIA) .................. 26
    39.4 Visual Accessibility (Color, Contrast, Text) .. 27
    39.5 Interaction Modality Alternatives ............. 27
    39.6 User-Configurable Options ..................... 27
    39.7 Testing and Validation ........................ 27

Screenshots .............................................. 28
Last pages: 30
```

---

```
“DTCCOMMDOC-420-0-03.PICT” 196 KB 2001-05-03 dpi: 300h x 300v pix: 1928h x 2895v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0004 of 0030
```

---

**(Page 5 starts the detailed sections)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**COMMANDER USER INTERFACE STANDARDS DOCUMENT**

**Product Name: Commander**
**21 May 2025**

**0. INTRODUCTION**

The Commander User Interface has two main goals: simplicity and power, **underpinned by a commitment to inclusivity and accessibility.** We want Commander to be easy to learn and intuitive to use **for everyone**, so we try to do things in a simple and natural manner and to build on concepts already familiar to users from gaming and advanced computing environments. An integrated system with a consistent **and accessible** user interface is easier to learn and to use. An integrated system is also more powerful than a group of separate programs that don't interact.

This Commander User Interface Standards Document presents the external view of what Commander looks like to the user and expresses a set of guidelines that the Commander development team will use in an effort to achieve that simplicity, power, **and broad accessibility.**

We want all Commander-integrated applications and agent interactions to have the same "feel" to the user, so that learning is minimized when going from application to application. Where possible, the same operation in two programs should be done in the same way and behave the same to the user. A given user action should have a consistent meaning throughout the system. Principles used in constructing system features **must be extensible and robust, considering diverse user needs and assistive technologies,** in order to minimize user frustration.

It is hoped that outside vendors and community contributors will find it to their advantage to use these conventions as well.

**1. DISPLAY**

**1.1 Main Window**
Commander runs within a standard Electron application window. The application aims for a full-screen, immersive experience. The default window size is 1200x800 pixels but is resizable by the user. For a frameless appearance and custom control, the main window uses `titleBarStyle: 'hidden'` on macOS or equivalent custom framing on other platforms. A custom draggable region is provided at the top of the application, integrated into the HUD. (See `src/components/DragWindowRegion.tsx` and IPC helpers in `src/helpers/ipc/window/`).

**1.2 Heads-Up Display (HUD)**
The primary interaction paradigm is a Heads-Up Display. This HUD consists of:

- A full-screen dynamic background, often a 3D scene rendered with `@react-three/fiber` (e.g., `SimpleGrid.tsx`, `PhysicsBallsScene.tsx`).
- A system of draggable and resizable panes for displaying content and interacting with agents (see Section 9. Panes).
- Fixed HUD elements for common actions and information display (see Section 8.3).

The HUD is designed to be immersive and provide immediate access to command and control functions, while ensuring all information is perceivable and operable through various means.

**(Page 6)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**1.3 Theme and Appearance**
Commander enforces a **dark theme** to maintain a consistent and focused aesthetic. This is set at the Electron nativeTheme level (`nativeTheme.themeSource = "dark"`) and applied globally using Tailwind CSS v4 and custom CSS variables. This theme is designed to meet WCAG 2.1 Level AA contrast ratios for text and interactive elements against their backgrounds.

- **Background:** Predominantly black or very dark gray (`--background: oklch(0.1 0 0)`).
- **Foreground:** Predominantly white or light gray for text and primary UI elements (`--foreground: oklch(0.9 0 0)`).
- **Accent Colors:** Used sparingly for active states or highlights (e.g., blue for active pane borders), ensuring they meet contrast requirements when conveying information.
- **Contrast:** All UI text and graphical elements critical for understanding content or operating functionality MUST maintain a minimum contrast ratio of 4.5:1 (for normal text) or 3:1 (for large text and graphical objects/UI components) against their immediate background. Tools like a contrast checker MUST be used during design and development.
- **Color Use:** Color MUST NOT be used as the sole means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. Alternative visual cues (e.g., icons, text labels, underlines, shape changes) MUST be provided.
- **Styling:** UI components are primarily styled using Shadcn UI and Tailwind CSS utility classes. Custom styles are defined in `src/styles/global.css`.

The `ToggleTheme.tsx` component currently acts as an indicator of the forced dark mode rather than a functional toggle. While user control over themes is not a current primary feature, future iterations will explore options such as a high-contrast mode and light theme alternatives to cater to a wider range of visual preferences and needs. Theme state is managed via `src/helpers/theme_helpers.ts` and IPC.

**1.4 Typography**
The primary font used throughout the Commander application is **Berkeley Mono**. This monospaced font is applied globally for UI text, chat messages, and other content to reinforce the "commander" and technical aesthetic. This font has been chosen for its clarity and legibility in a technical context. Font definitions are in `src/styles/fonts.css` and applied via `src/styles/global.css`.

- **Font Size:** Default font sizes MUST be sufficient for readability (e.g., minimum 12-14pt equivalent for body text, depending on context and viewing distance assumptions for a HUD).
- **Text Scaling:** The UI MUST support text scaling up to 200% without loss of content or functionality, and without requiring horizontal scrolling for full lines of text. This can be achieved through browser zoom or application-specific settings (future).
- **Line Spacing (Leading) and Spacing:** Sufficient line spacing (at least 1.5 times the font size) and paragraph spacing (at least 2 times the font size) should be used for blocks of text to improve readability. Letter spacing (tracking) and word spacing must also be adequate.
- **Text on Images/Complex Backgrounds:** If text is rendered over images or dynamic backgrounds, it MUST have a solid or sufficiently opaque backing, or a text shadow/outline, to ensure contrast requirements are met.

**2. MOUSE AND CURSOR**

Pointing to things on the screen is done with a mouse (or trackpad/equivalent). The mouse is a small, hand-sized object which is free to be rolled on a flat, horizontal surface. Motion of the mouse to right or left moves a cursor on the screen to right or left, respectively. Moving the mouse away from the user moves the cursor upward, and moving the mouse toward the user moves the cursor downward. When cursor reaches the edge of the screen it remains pinned to the edge although it may move along the edge, until the appropriate x component of the mouse's motion is reversed, at which moment the cursor begins to move again.

**Accessibility Considerations:**
- While the mouse is a supported input method, all functionalities achievable by mouse interaction MUST also be fully operable via keyboard (see Section 4 and 39.2) and, where appropriate, NUI (Section 3) or Voice Commands (Section 34). No functionality should be exclusively mouse-dependent.
- Cursor changes that convey information (e.g., resize arrows, grab hand) MUST have alternative non-visual cues for users who cannot see the cursor or its shape. For custom interactive elements, ARIA attributes should be used to describe the element's role and state (see Section 39.3).

Within Commander:

- The standard operating system cursor is used.
- The mouse is the primary input for interacting with traditional UI elements (where applicable, though minimized in favor of NUI).
- **Pane Interaction:** The mouse is a primary method for dragging panes by their title bars and resizing panes using their resize handles. This is facilitated by the `@use-gesture/react` library in `src/panes/Pane.tsx`.
- **Clicking:** Standard mouse clicks are used to activate buttons, select items in lists, and interact with content within panes.
- **Scrolling:** Mouse wheel scrolling is supported for scrollable content areas within panes.

The cursor may take on different shapes to indicate its current function. For example, when hovering over resize handles of a pane, the cursor changes to the appropriate resize arrow. When hovering over a draggable title bar, it changes to a grab hand.

The mouse system incorporates a button on its top surface that allows the user to signal a particular position on the screen to the computer. The system is always aware of the position indicated by the mouse. When the button is up, motion of the mouse causes cursor motion and may change the shape of the cursor, but no other changes occur to anything on the screen as a result of the motion.

**(Page 7)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**3. HAND TRACKING (NUI)**

Commander embraces Natural User Interface (NUI) principles, with hand tracking as a core interaction modality.

**3.1 Overview and Technology**
Hand tracking is implemented using the MediaPipe Hands library. The `useHandTracking` hook (`src/components/hands/useHandTracking.ts`) manages the camera feed (via a hidden `<video>` element) and processes hand landmarks.

- A `landmarkCanvasRef` is used to draw detected hand landmarks for debugging or visual feedback, though this is typically overlaid and can be made invisible in production.
- The system supports tracking up to two hands (`maxNumHands: 2`).
- Handedness ("Left" or "Right") is detected for each tracked hand.

**3.2 Hand Pose Recognition**
A dedicated module, `src/components/hands/handPoseRecognition.ts`, is responsible for interpreting hand landmarks to recognize a set of predefined hand poses.

- **Supported Poses (defined in `src/components/hands/handPoseTypes.ts`):**
  - `FIST`: All fingers curled, thumb potentially across fingers.
  - `TWO_FINGER_V`: Index and middle fingers extended and spread, other fingers curled.
  - `FLAT_HAND`: All fingers extended and relatively close together.
  - `OPEN_HAND`: All fingers extended and spread wide.
  - `PINCH_CLOSED`: Thumb tip and index fingertip are close together.
  - `NONE`: No specific pose detected or no hand tracked.
- Pose recognition logic uses Euclidean distances between landmarks and relative landmark positions. Thresholds for pose detection (e.g., pinch distance) are defined and may be subject to tuning.

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

- **Landmark Canvas:** `landmarkCanvasRef` in `useHandTracking` draws hand connections and landmarks. Key landmarks (thumb tip, index tip) are highlighted. Pinch midpoints can also be visualized with coordinates for debugging. This canvas is typically mirrored like the video feed.
- **Dynamic Pointer (3D):** `src/components/hands/DynamicPointer.tsx` renders an invisible `RigidBody` in a 3D physics scene that follows the primary hand's position (typically index finger tip). This allows physical interaction with other 3D objects in the scene.

    **3.5 Accessibility Considerations for NUI**
    While NUI is a primary interaction modality, it is not suitable for all users.
    - **Alternative Inputs:** All actions performable via hand tracking MUST have equivalent keyboard and mouse/trackpad alternatives. Voice commands (future) will provide another alternative. (See Sections 2, 4, 34, and 39.5)
    - **No NUI-Exclusive Functionality:** No feature or information should be exclusively accessible or operable through hand tracking.
    - **User Configuration:** (Future) Users should be able to:
        - Adjust sensitivity and thresholds for pose recognition to accommodate varying motor abilities.
        - Disable hand tracking entirely if it interferes with other assistive technologies or user preferences.
        - Customize gesture mappings if defaults are problematic. (See Section 33.5)
    - **Clear Feedback:** Visual feedback for hand tracking (landmarks, pointer) should be clear, but also consider that some users may have the visual feedback turned off or may not be able to see it. Application state changes due to NUI input should be perceivable through other means (e.g., auditory cues, clear changes in UI elements).
    - **Avoid Fatigue:** Interactions requiring prolonged or precise hand poses should be designed with care to minimize physical strain. Quick, distinct gestures are preferred over sustained holds where possible for critical or frequent actions.

**(Page 8 is where the COMM doc starts section 4. KEYBOARD. We'll continue adapting)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**4. KEYBOARD**

The keyboard is a fundamental input method for Commander, crucial for both power users and accessibility.

**4.1 Standard Text Input**
The keyboard is used for standard text input in components such as the Chat window (`src/components/chat/ChatWindow.tsx`) and various input fields throughout the application (e.g., NIP-90 request form).

- Standard OS-level text editing capabilities (selection, copy, paste, undo) are expected to function normally within these text input areas.
- The "Enter" key is used to send messages in the chat window, while "Shift+Enter" creates a new line.
- All text input fields MUST be accessible via keyboard, support standard editing commands, and be clearly labeled (e.g., using `<label>` for HTML inputs, or `aria-labelledby` for custom components, ensuring association for assistive technologies).

**4.2 Hotkeys & Keybindings (StarCraft Style Philosophy)**
Commander aims to provide an advanced and efficient control scheme for power users through a system of hotkeys and keybindings, drawing inspiration from Real-Time Strategy (RTS) games like StarCraft. This system is a future development goal and its full specification is pending.

**Core Principles:**

- **Efficiency:** Hotkeys should provide faster access to frequently used commands and agent interactions than NUI or mouse-based methods.
- **Memorability & Learnability:** While comprehensive, the system should be designed with logical groupings and mnemonic aids to facilitate learning. (Future) An accessible in-app guide or help section detailing all hotkeys should be provided.
- **Context-Sensitivity:** Hotkeys may vary depending on the active pane or selected agent/element.
- **Customization:** (Future) Users MUST be able to customize keybindings to avoid conflicts with assistive technology or OS-level shortcuts, and to suit their personal preferences or physical needs. The ability to disable specific hotkeys should also be considered. (See Section 33.5)
- **Standard Operations:** Common operations like selecting agents, issuing commands (move, attack, build – metaphorically for agents), cycling through units/panes, and accessing specific UI elements (e.g., opening the NIP-90 dashboard) will be candidates for hotkeys.
- **Modifier Keys:** Ctrl, Shift, Alt (Cmd on macOS) will be used in combination with letter/number keys to expand the range of available commands, similar to RTS control group management or ability modifiers.
- **Feedback:** Clear visual or auditory feedback should be provided when hotkeys are activated.

_(Detailed specification of hotkeys is TBD and will be added in a future revision of this document.)_

    **4.3 Keyboard Navigation and Interaction Standards**
    Beyond hotkeys, comprehensive keyboard navigation is paramount for accessibility. (See also Section 39.2)
    - **Focus Management:**
        - All interactive UI elements (buttons, links, input fields, pane headers, custom controls) MUST be focusable using the Tab key (and Shift+Tab for reverse).
        - A logical and predictable focus order MUST be maintained. Navigation flow should generally follow the visual layout (e.g., left-to-right, top-to-bottom within a pane, then to next pane or global controls).
        - Upon opening dialogs, modals, or new panes that take primary interaction focus, keyboard focus MUST be programmatically moved to an element within that new context.
        - When a dialog or modal is closed, focus MUST return to the element that triggered its opening, or a logical preceding element.
    - **Visible Focus Indicator:** A highly visible focus indicator MUST be present on the element that currently has keyboard focus. This indicator must have sufficient contrast against its background and surrounding elements (meeting 3:1 contrast ratio). Standard browser outlines should be preserved or enhanced, not suppressed without a clear, equally accessible replacement.
    - **Component-Level Interaction:**
        - Standard HTML controls (buttons, inputs, etc.) should be used where possible to leverage built-in keyboard accessibility.
        - Custom components (e.g., pane manipulation, HUD elements) MUST implement appropriate keyboard interaction patterns (e.g., arrow keys for navigating within a component or adjusting values, Enter/Space to activate, Esc to dismiss). ARIA design patterns should be followed.
    - **No Keyboard Traps:** Users MUST be able to navigate into and out of all sections of the UI using only the keyboard. Focus should not become trapped within any component from which the user cannot escape using Tab, Shift+Tab, or Esc as appropriate.
    - **Activation:** Interactive elements such as buttons MUST be activatable using both Enter and Space keys. Links are typically activated with Enter.
    - **ARIA Attributes:** Appropriate ARIA roles, states, and properties MUST be used to make custom controls understandable and operable by assistive technologies (see Section 39.3).

**5. SYSTEM STATE AND PERSISTENCE**

Commander persists certain aspects of its state to enhance user experience across sessions.

- **Pane State:** The layout of panes (positions, sizes, types, active state) is persisted using Zustand's `persist` middleware with `localStorage`. This is managed in `src/stores/pane.ts`. The `merge` function attempts to gracefully handle persisted state, ensuring default panes like the NIP-28 channel are present.
- **User Preferences:**
  - **Language:** The selected application language is stored in `localStorage` and managed by `src/helpers/language_helpers.ts`.
  - **Theme:** While Commander currently enforces a dark theme, the mechanism for theme persistence via `localStorage` (`THEME_KEY`) exists in `src/helpers/theme_helpers.ts`.
  - **Telemetry:** User preference for enabling/disabling telemetry is persisted (see `docs/TELEMETRY.md`, though the PGlite-based persistence mentioned there is a future plan; current implementation likely uses `localStorage` or Electron settings API via `TelemetryServiceImpl.ts`).
  - **Accessibility Preferences (Future):** Persisted settings for font size adjustments, high-contrast mode selection, reduced motion preferences, NUI sensitivity levels, and custom keybindings. (See Section 33.5)
- **NIP-90 Request Data:** Ephemeral secret keys associated with NIP-90 job requests are stored in `localStorage` by `src/components/nip90/Nip90RequestForm.tsx` to allow decryption of DVM responses across sessions.
- **PGlite Database (Future):** `docs/pglite.md` outlines plans for local data persistence using PGlite, either in the main process (filesystem) or renderer (IndexedDB), potentially synchronized with ElectricSQL. This would be used for local-first data like messages, threads, and settings.

**(Page 9)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**6. INITIALIZATION**

Upon application startup, Commander initializes its UI and services:

1.  **Electron Main Process (`src/main.ts`):**
    - Creates the main `BrowserWindow`.
    - Forces the native OS theme to dark (`nativeTheme.themeSource = "dark"`).
    - Sets up webPreferences, including `contextIsolation: true` and the preload script (`src/preload.ts`).
    - Loads the renderer entry point (`index.html` -> `src/renderer.ts`).
    - Registers IPC listeners for window controls, theme management, and Ollama communication (`registerListeners` from `src/helpers/ipc/listeners-register.ts`).
    - Installs React DevTools in development.
2.  **Preload Script (`src/preload.ts`):**
    - Exposes specific IPC functionalities to the renderer process via `contextBridge` (`exposeContexts` from `src/helpers/ipc/context-exposer.ts`). This includes `window.electronAPI.ollama`, `window.themeMode`, and `window.electronWindow`.
3.  **Renderer Process (`src/renderer.ts` -> `src/App.tsx`):**
    - Initializes the main Effect runtime (`mainRuntime` from `src/services/runtime.ts`), which sets up all core services (Nostr, NIP-04/19/28/90, BIP39/32, Spark, Telemetry, Ollama, HttpClient).
    - Renders the root React component (`App`).
    - `App.tsx` initializes i18n, syncs the theme (forced dark), and sets up the TanStack Router.
4.  **Pane System (`src/stores/pane.ts`):**
    - The `usePaneStore` initializes with default panes, notably the main NIP-28 channel pane (`DEFAULT_NIP28_PANE_ID`), as defined in `getInitialPanes`.
    - Persisted pane layout from previous sessions is loaded and merged. Any persisted accessibility settings (future) would also be applied here.
5.  **HUD (`src/pages/HomePage.tsx`):**
    - Renders the `SimpleGrid` background and `PaneManager`.
    - Initializes hand tracking (if enabled by default, or upon user toggle).
    - Displays HUD control buttons (Reset, Hand Tracking Toggle, New Channel, NIP-90 Dashboard).

**7. EVERYDAY OPERATION**

The user interacts with Commander primarily through the HUD.

- **Information Display:** Panes display various types of information like chat messages, NIP-90 DVM interactions, agent statuses, and Bitcoin balance, ensuring text is legible and information is structured for clarity.
- **Interaction:**
  - **Mouse:** Used for clicking buttons, selecting text, dragging/resizing panes.
  - **Keyboard:** Used for text input (chat, forms), comprehensive UI navigation, pane manipulation, and (future) hotkeys for commands.
  - **Hand Tracking (NUI):**
    - Panes can be dragged using the `PINCH_CLOSED` gesture on their title bars.
    - Specific hand poses can trigger actions, e.g., controlling 3D scenes.
  - **Voice Commands (Future):** Intended to provide an alternative input modality for common commands.
- **Agent Commands:** Users command AI agents, presumably through chat interfaces within panes or dedicated agent control panes. The results of agent actions and earnings (Bitcoin) are displayed within the HUD using accessible feedback methods.
- **Pane Management:** Users can open new panes (e.g., new NIP-28 channels via `NewChannelButton.tsx`, NIP-90 dashboard via `Nip90DashboardButton.tsx`), close dismissable panes, and rearrange their workspace by dragging and resizing. All management functions must be keyboard accessible.
- **Settings:** Users can toggle hand tracking and (future) other preferences like telemetry and accessibility options (See Section 33). Language can be changed via `LangToggle.tsx`.

The overall flow is designed to be dynamic and responsive, allowing users to manage multiple information streams and agent interactions simultaneously, irrespective of their preferred input modality or abilities.

**(Page 10)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**8. WHAT THE SCREEN LOOKS LIKE (HUD LAYOUT)**

Commander presents a Heads-Up Display (HUD) that occupies the entire application window.

**8.1 Background Grid**
A subtle, static grid pattern (`src/components/home/SimpleGrid.tsx`) is rendered as the rearmost layer of the HUD. It provides a sense of space and a clean backdrop for other UI elements. The grid lines are `rgba(255, 255, 255, 0.05)` on a black background, with a cell size of 40x40 pixels. It is non-interactive (`pointer-events-none`). The grid's color and intensity MUST be subtle enough not to interfere with the legibility of foreground text and interactive elements. Contrast between the grid and key HUD elements must be considered.

**8.2 Pane Manager Area**
The main area of the HUD is managed by the `PaneManager` (`src/panes/PaneManager.tsx`), which renders all active panes. Panes can be freely moved and resized within this area and can overlap (see Section 9. Panes). The focus order among panes must be logical and controllable via keyboard.

**8.3 Core HUD Elements**
Several key informational and interactive elements are typically part of the HUD, often realized as panes or fixed components. All HUD elements, whether fixed or within panes, MUST have sufficient contrast. Iconic buttons or controls MUST have accessible names (e.g., via `aria-label` or visually hidden text) if their meaning is not clear from context or an adjacent visible label. (See Section 39.3)

    **8.3.1 Chat Window**
    A primary interaction point, styled reminiscent of World of Warcraft chat windows, typically positioned at the bottom-left. This is usually a specific pane type (e.g., `nip28_channel` or a generic `chat` pane).
    *   Implemented via `src/components/chat/ChatContainer.tsx` within a pane.
    *   Features message display area and a text input for sending messages. Text input must be labeled for assistive technologies. Chat messages should be structured semantically for screen reader navigation.

    **8.3.2 Hotbar (Future/Placeholder)**
    Intended for the bottom-center of the HUD, reminiscent of World of Warcraft action bars.
    *   This would provide quick access to frequently used agent commands, abilities, or tools.
    *   *Current Status:* Conceptual; no specific implementation in the provided codebase. UI standards for its appearance and interaction (mouse click, keyboard hotkey, hand gesture selection, ARIA roles for buttons) will be defined later.

    **8.3.3 Inspector Window (Future/Placeholder)**
    Intended for the bottom-right, reminiscent of StarCraft unit/building information panels.
    *   This would display detailed information about a selected agent, task, NIP-90 job, or other entities. Content must be structured accessibly (e.g., proper heading levels, lists).
    *   *Current Status:* Conceptual; no specific implementation. Standards for content structure and interaction will be defined later.

    **8.3.4 Bitcoin Balance Display (Future/Placeholder)**
    Intended for the top-right, reminiscent of StarCraft mineral/gas displays.
    *   This would show the user's current Bitcoin balance, presumably managed by the Spark SDK service. Text must meet contrast requirements.
    *   *Current Status:* Conceptual; no specific implementation. Standards for its appearance and update frequency will be defined later.

**8.4 Control Elements**
Fixed buttons for global HUD and feature control are positioned at the bottom of the screen. These buttons MUST have clear visual focus indicators and accessible names (e.g., `aria-label`). Their state (e.g., 'Hand Tracking On/Off') MUST be programmatically determinable via ARIA attributes (e.g., `aria-pressed`).

**8.4.1 Hand Tracking Toggle**
A button (`src/components/hands/HandTrackingToggleButton.tsx`) typically located at `bottom-4 left-16` (from `HomePage.tsx`) allows the user to enable or disable hand tracking.
_ Icon: `Hand` icon from `lucide-react`. `aria-label="Toggle Hand Tracking"` required.
_ Visual State: Button appearance changes to indicate if hand tracking is active (e.g., primary color background) or inactive. State conveyed by `aria-pressed`.

**(Page 11)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

    **8.4.2 Pane Creation Buttons**
    Buttons to open specific functional panes are part of the HUD. They MUST have accessible names.
    *   **New NIP-28 Channel Button (`src/components/hud/NewChannelButton.tsx`):** Located at `bottom-4 left-[7rem]`. Opens a new NIP-28 chat channel pane. Icon: `MessageSquarePlus`. `aria-label="Open new NIP-28 channel"` required.
    *   **NIP-90 DVM Dashboard Button (`src/components/hud/Nip90DashboardButton.tsx`):** Located at `bottom-4 left-[10rem]`. Opens the NIP-90 dashboard pane. Icon: `Cpu`. `aria-label="Open NIP-90 DVM Dashboard"` required.

    **8.4.3 Reset HUD Button (`src/components/ResetHUDButton.tsx`)**
    Located at `bottom-4 left-4`. Resets the pane layout to its default initial state as defined in `src/stores/pane.ts`. Icon: `IconRefresh` (SVG). `aria-label="Reset HUD layout"` required.

**9. PANES**

Panes are the primary containers for content and interaction within Commander. They are designed to be flexible, draggable, and resizable, managed by the `usePaneStore` (see Section 5) and rendered by `PaneManager.tsx`. The individual pane UI and behavior are handled by `Pane.tsx`.

**9.1 Basic Pane Appearance**
A pane is a rectangular region drawn with a dark, semi-transparent background (`bg-black/90 backdrop-blur-sm`) and a border (`border-border/20`). Panes have rounded corners (`rounded-lg`) and a drop shadow (`shadow-lg`). Contrast between pane background, border, title bar, and text/icons MUST meet WCAG AA requirements.

- **Title Bar:** Each pane has a title bar at the top (`h-8`), which is darker (`bg-black/80`) and displays the pane's `title` (truncated if too long). The title bar is the primary affordance for dragging the pane and MUST be keyboard focusable to allow keyboard-based manipulation. It should have appropriate ARIA roles.
- **Content Area:** Below the title bar is the content area (`h-[calc(100%-2rem)]`), which has `overflow-auto` to allow scrolling if content exceeds the pane's dimensions. It has a slight padding (`p-1`).
- **Dismiss Button:** Dismissable panes show an 'X' icon (`lucide-react IconX`) in the top-right of the title bar for closing the pane. This button MUST be keyboard focusable and have an accessible name (e.g., `aria-label="Close [Pane Title]"`).

**9.2 Pane Lifecycle (Adding, Removing)**

- **Adding Panes:** New panes are added via actions in `usePaneStore` (e.g., `addPane`, `openChatPane`, `createNip28ChannelPane`). New panes are typically made active and brought to the front. Their initial position is calculated by `calculateNewPanePosition` to tile or cascade them. When a new pane opens and receives focus, screen readers should be notified.
- **Removing Panes:** Dismissable panes can be closed by clicking their 'X' button (or via keyboard, e.g., Esc when button has focus, or a dedicated pane close hotkey). This calls `removePaneAction`. If the active pane is removed, the store attempts to activate another pane (typically the last one in the list), and focus should be managed logically.
- **Default Panes:** On startup, default panes (e.g., a main NIP-28 chat channel) are initialized as per `getInitialPanes` in `src/stores/pane.ts`.

**9.3 The Active Pane**
Only one pane can be active (focused) at a time. The active pane is visually distinguished by:

- A more prominent border that is not solely reliant on color (e.g., increased thickness or different style in addition to color change).
- An off-screen text announcement for screen readers (e.g., through an ARIA live region or by updating the window title if appropriate, stating "[Pane Title] active").
- A higher `zIndex` to ensure it renders above other panes. The `PaneManager` assigns z-index based on the pane's position in the `panes` array (where the active pane is moved to the end). `Pane.tsx` also uses the `isActive` prop to set a z-index.

**9.4 Making a Pane Active**
A pane becomes active when:

- The user clicks anywhere on the pane (including its title bar or content area, but excluding resize handles or buttons within the title bar). This is handled by `handlePaneMouseDown` in `Pane.tsx`, which calls `bringPaneToFrontAction` in the store.
- A new pane is created; it typically becomes active immediately.
- The user navigates to a pane using keyboard commands (e.g., a hotkey to cycle through panes, like Ctrl+Tab, and Enter/Space to activate the focused pane).

**(Page 12)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**9.5 Moving a Pane (Mouse, Hand, Keyboard)**
Panes can be moved by dragging their title bar.

- **Mouse Drag:** Implemented in `Pane.tsx` using `useDrag` from `@use-gesture/react`. The cursor changes to `cursor-grab` (or `active:cursor-grabbing`).
- **Hand Pinch-Drag:** Implemented in `HomePage.tsx`. If hand tracking is active, performing a `PINCH_CLOSED` gesture with the `pinchMidpoint` over a pane's title bar initiates a drag. Moving the pinched hand moves the pane. Releasing the pinch ends the drag.
- **Keyboard:** When a pane's title bar or the pane itself (as a whole, if designed as such) has focus, users MUST be able to move it using arrow keys, potentially in combination with a modifier key (e.g., Ctrl + Arrow Keys). Clear instructions for keyboard-based pane manipulation should be available in help documentation.
- **Bounds:** Panes are constrained within the viewport, with a small margin ensuring a part of the pane (usually the title bar or a handle area) remains accessible (`bounds` in `Pane.tsx` and drag logic). The `ensurePaneIsVisible` utility helps maintain visibility.
- **State Update:** The `updatePanePositionAction` in the store is called when the drag operation ends (on `last` event for mouse drag, or on significant movement for hand drag, or after keyboard move) to persist the new `x`, `y` coordinates. `lastPanePosition` in the store is updated.

**9.6 Resizing a Pane (Mouse, Keyboard)**
Panes can be resized by dragging their borders/corners.

- **Affordance:** Eight resize handles are rendered around the pane's perimeter (top, bottom, left, right, and corners). These are small, semi-transparent areas that change the mouse cursor to the appropriate resize icon (e.g., `nwse-resize`, `ew-resize`). These handles MUST be keyboard focusable or an alternative keyboard mechanism for resizing must be provided.
- **Interaction (Mouse):** Implemented in `Pane.tsx` within the `useResizeHandlers` custom hook, using `useDrag` for each handle.
- **Interaction (Keyboard):** When a pane or its resize affordance has focus, users MUST be able to resize it using arrow keys (e.g., Alt + Arrow keys, or similar intuitive combination). Clear instructions for keyboard-based resizing must be provided.
- **Constraints:** Panes have minimum dimensions (`minWidth = 200`, `minHeight = 100`).
- **State Update:** `updatePaneSizeAction` (and `updatePanePositionAction` for handles that affect position) is called when the resize operation ends to persist the new `width`, `height`. `lastPanePosition` is updated.

**9.7 Scrolling within Panes**
If the content of a pane exceeds its visible dimensions, scrollbars appear.

- **Mechanism:** The `pane-content` div in `Pane.tsx` has `overflow-auto`.
- **Appearance:** Custom scrollbars are styled in `src/styles/global.css` for a more integrated HUD aesthetic (thin, semi-transparent). This styling targets `-webkit-scrollbar`. Standard OS scrollbars will appear if custom styling is not supported or overridden.
- **Accessibility:** Scrollable areas MUST be navigable via keyboard (e.g., arrow keys, Page Up/Down, Home, End when the scrollable area or an element within it has focus). Custom scrollbars, if used, MUST be keyboard operable if they are interactive and provide appropriate visual cues and ARIA attributes if they are custom controls.

**9.8 Pane Types**
Each pane has a `type` property (defined in `src/types/pane.ts`) that determines the content it displays. The `PaneManager.tsx` uses this type to render the appropriate child component. Content within each pane type must adhere to accessibility standards relevant to its nature (e.g., forms, text display, lists).

- **Current Types:**
  - `'default'`: A generic placeholder pane.
  - `'chat'`: Used for individual chat threads (potentially for direct messages or specific agent interactions).
  - `'chats'`: (Conceptual) A pane to list available chat threads or contacts.
  - `'user'`: (Conceptual, possibly for user status or profile).
  - `'diff'`: (Conceptual, for displaying differences between text/code).
  - `'changelog'`: (Conceptual, for application updates).
  - `'nip28_channel'`: Displays a NIP-28 public chat channel interface using `Nip28ChannelChat.tsx`. Content includes `channelId` and `channelName`.
  - `'nip90_dashboard'`: Displays the NIP-90 Data Vending Machine dashboard using `Nip90Dashboard.tsx`.
- **Extensibility:** New pane types can be added by defining a new type string and adding a corresponding rendering case in `PaneManager.tsx`.

**(Sections 10-12 relate to selection, which in Commander is mostly standard OS text selection within input fields or specific content views.)**

**(Page 13)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**10. THE SELECTION (TEXT AND CONTENT)**

Within panes that display editable text (e.g., chat input) or selectable content, selection behavior follows standard operating system conventions.

- **Text Selection:** Achieved by mouse click-and-drag. Standard keyboard text selection (Shift + Arrow keys, etc.) is also supported.
- **Content Selection:** Specific panes might implement their own content selection mechanisms (e.g., selecting an item in a list within the Inspector pane). These will adhere to common interaction patterns (click to select, Shift+click for range, Ctrl/Cmd+click for multiple individual items where appropriate) and MUST be keyboard operable (e.g., arrow keys to navigate, Space to select/deselect).
- **Visual Indication:** Selection styling MUST provide sufficient contrast against both selected and unselected content and backgrounds (see Section 1.3).

**11. VISIBILITY OF OPERATIONS ON SELECTIONS**

Operations available for selected content are typically made visible through:

- **Context Menus (Future):** Right-clicking on a selection or selected item may reveal a context-sensitive menu with relevant actions (e.g., copy, paste, agent commands related to the selected item). Context menus MUST be keyboard-operable (e.g., via Shift+F10 or context menu key) and navigable using arrow keys, Enter/Space to activate, and Esc to close. (See Section 39.3 for ARIA menu patterns).
- **Dedicated UI Elements:** The Inspector pane (future) would display actions relevant to the currently selected agent or item in another pane. These elements must be keyboard accessible.
- **Hotkeys (Future):** Keyboard shortcuts will provide access to operations on the current selection.

Commander avoids "modes" where operations are chosen before the selection, preferring an object-action sequence.

**12. MARKING A SELECTION**

Visual feedback for selections is standard:

- **Text:** Selected text is typically highlighted with the system's selection color or an application-defined color that meets contrast requirements (see Section 1.3).
- **UI Elements:** Selected items in lists or other custom views will have a distinct visual state (e.g., different background color, border) that is not solely reliant on color and meets contrast requirements. ARIA attributes like `aria-selected="true"` MUST be used.

**(Section 13-17 cover menus, which in Electron are primarily OS-native, plus any in-app navigation that acts like a menu.)**

**(Page 14)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**13. THE MENU BAR AND IN-APP MENUS**

**13.1 Application Menu Bar (Electron Native)**
As an Electron application, Commander utilizes the native OS menu bar (File, Edit, View, Window, Help on macOS; integrated into the window frame on Windows/Linux).

- **Standard Menus:** These menus provide standard application-level commands (e.g., Quit, Copy, Paste, Toggle Developer Tools). Their content is largely defined by Electron defaults and can be customized in `src/main.ts` if necessary. Native menus are generally accessible by default, but custom menu items must have clear, descriptive labels and appropriate mnemonics where applicable.
- **Customization:** Currently, no significant customization of the native menu bar is detailed in the codebase beyond Electron defaults.

**13.2 In-App Navigation Menus**
Commander includes a simple navigation menu component (`src/components/template/NavigationMenu.tsx`) using Shadcn UI's `NavigationMenu` components.

- **Purpose:** Primarily used for routing between top-level application views/pages (e.g., "Home Page", "Second Page") as defined in `src/routes/routes.tsx`.
- **Appearance:** Horizontal list of links, styled according to Shadcn UI and Tailwind CSS.
- **Interaction:** Standard mouse click to navigate. These menus MUST use appropriate ARIA roles (e.g., `navigation`, `menubar`, `menuitem`) to ensure they are understandable to assistive technologies. Keyboard navigation (Tab, arrows, Enter, Esc) MUST be fully supported by the underlying Radix UI primitives.

**13.3 Contextual "Menus" within Panes (Future)**
While not traditional menus, actions available for items within specific panes (e.g., right-click context menus, action buttons in an Inspector pane) will provide menu-like functionality. These will be designed for clarity and ease of access, consistent with the overall HUD aesthetic, and MUST follow ARIA menu patterns for keyboard interaction and screen reader support.

**14. MAKING MENU CHOICES**

- **Native Menu Bar:** Interaction follows OS conventions (mouse click, keyboard navigation with Alt keys or arrow keys).
- **In-App Navigation Menu:** Mouse click on links. Keyboard navigation (Tab to focus, Enter to activate, arrow keys if structured as a menubar).

**15. MENU ITEMS THAT DO NOTHING (DISABLED ITEMS)**

- **Native Menu Bar:** Menu items that are not applicable in the current context will be disabled (grayed out) according to OS standards. Electron's menu API allows for dynamic enabling/disabling.
- **In-App Navigation Menu/Buttons:** Buttons or links for unavailable actions will be styled as disabled (e.g., reduced opacity, `disabled:opacity-50` Tailwind class) and will not respond to clicks. They MUST have `aria-disabled="true"` set, and their visual styling must clearly indicate their disabled state without relying solely on color (e.g., reduced opacity plus a grayed-out appearance).

**(Page 15)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**16. CONTENTS OF THE MENU BAR AND MENUS**

- **Native Electron Menu Bar (Default Structure - illustrative):**
  - **File:** New Window, Close Window, Quit.
  - **Edit:** Undo, Redo, Cut, Copy, Paste, Select All.
  - **View:** Reload, Force Reload, Toggle Developer Tools, Toggle Full Screen.
  - **Window:** Minimize, Zoom, Close. (Window control buttons are also part of the custom title bar region for direct mouse interaction.)
  - **Help:** About Commander, Documentation links, Accessibility Information (Future).
  - _(Actual menus can be customized in `src/main.ts` if specific app actions are needed here.)_
- **In-App Navigation Menu (`NavigationMenu.tsx`):**
  - Currently contains links to "Home Page" (`/`) and "Second Page" (`/second-page`). This menu is primarily for demonstrating routing capabilities.

**17. MAKING MENU CHOICES FROM THE KEYBOARD**

Interaction with the native Electron menu bar via keyboard follows OS conventions (e.g., Alt key to reveal mnemonics on Windows/Linux, standard macOS menu keyboard navigation). In-app navigation elements and buttons are part of the standard Tab order for keyboard accessibility and MUST support activation via Enter/Space and navigation using arrow keys if they are structured as ARIA menus/menubars.

**18. THE DIALOG BOX / MODALS**

Commander utilizes Shadcn UI, which provides components for dialogs/modals. These will be used for:

- Presenting critical information or warnings to the user.
- Requesting user input for specific tasks that require focused interaction (e.g., settings configuration, confirmation prompts).
- **Appearance:** Dialogs will adhere to the application's dark theme and styling conventions defined by Shadcn UI and Tailwind CSS. They will typically overlay the current view with a backdrop to focus user attention. Text and controls within dialogs must meet contrast requirements.
- **Interaction:** Standard interaction with dialog elements (buttons like OK/Cancel, input fields) via mouse or keyboard.
- **Accessibility Standards:** Dialogs/Modals MUST adhere to the following:
    - **Focus Management:** When a dialog opens, focus MUST be moved to an interactive element within the dialog (often the first input field or the primary action button). Focus MUST be trapped within the dialog (i.e., tabbing should cycle within the dialog and not go to elements behind it) until it is closed. Upon closing, focus MUST return to the element that triggered the dialog, or a well-defined logical predecessor.
    - **Keyboard Operation:** Dialogs MUST be dismissible via the `Esc` key. All interactive elements within the dialog MUST be keyboard accessible and follow a logical tab order.
    - **ARIA Attributes:** Dialogs MUST use `role="dialog"` (or `role="alertdialog"` if it's an alert requiring immediate user attention). `aria-modal="true"` MUST be set. The dialog MUST have an accessible name, typically provided by `aria-labelledby` referencing a visible dialog title element (e.g., `<h2 id="dialog-title">...</h2> <div role="dialog" aria-labelledby="dialog-title">...</div>`). If there's descriptive text, `aria-describedby` can be used.
- _(Specific dialog implementations are not detailed in the provided core codebase but would leverage `Dialog` components from `src/components/ui/` if added via `npx shadcn@canary add dialog`.)_

**(Page 16)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**19. TEXT EDITING PHILOSOPHY**

Text input and editing within Commander primarily occur in designated input fields, such as the chat input (`Textarea` in `ChatWindow.tsx`) or form fields (e.g., in `Nip90RequestForm.tsx`).

- **Behavior:** Text editing follows standard OS conventions.
- **Components:** Shadcn UI components like `Input` and `Textarea` are used, providing familiar text editing affordances. These components MUST be associated with visible labels using `<label for="...">` or ARIA properties (`aria-labelledby`) for accessibility.
- **NUI Interaction:** Direct text input via hand gestures (e.g., a virtual keyboard or handwriting recognition) is not a current feature but could be explored in future NUI enhancements, ensuring any such feature is also accessible.

**20. TYPING PRINTING CHARACTERS**

When a character is typed, it is inserted at the current caret position within an active text input field. If text is selected, typing a character typically replaces the selection. This is standard OS behavior.

- A beep or visual indication may occur if typing is attempted in a non-input context or when an input field is disabled (though this is usually handled by the OS or UI component library). Any custom auditory feedback must be user-configurable.

**21. KEYS THAT ALTER THE MEANING OF OTHER KEYS (MODIFIERS)**

Standard modifier keys (Shift, Control, Alt/Option, Command/Windows) function as per OS conventions for text editing (e.g., Shift + arrow for selection, Ctrl/Cmd + C for copy).

- **Application-Specific Modifiers (Hotkeys):** As detailed in Section 4.2, modifier keys will be integral to the (future) StarCraft-style hotkey system for issuing agent commands and navigating the UI efficiently. For example:
  - `Ctrl + [1-9]` could select/create control groups of agents.
  - `Shift + Click` could add/remove agents from a selection.
  - `Alt + [Key]` could trigger secondary abilities for selected agents.
  These hotkeys must be customizable to avoid conflicts with assistive technologies. (See Section 33.5)
- **Pane Interaction Modifiers:**
  - `isCommandKeyHeld` (Cmd on macOS, Ctrl on Windows/Linux) is used in `openChatPaneAction` to alter the behavior of opening a new chat pane (e.g., tiling vs. replacing).

**(Page 17)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**22. SHIFT**

The SHIFT key is used in standard ways:

- To type uppercase letters or the upper symbols on number/symbol keys.
- In combination with arrow keys or mouse clicks for extending text selections.
- As a modifier in (future) application-specific hotkeys.
- With Tab (`Shift + Tab`) to navigate focus in reverse order.

**23. ALPHA LOCK (CAPS LOCK)**

The CAPS LOCK key functions as per standard OS behavior, toggling persistent uppercase input for alphabetic characters. It generally does not affect number or symbol keys or application-specific hotkeys. Its state should not be relied upon for application logic, as users may use it for accessibility reasons.

**24. CODE (SPECIAL KEYS FOR HOTKEYS)**

This section in the COMM document referred to a specific "CODE" key. In Commander, this concept maps to the use of standard keyboard keys (letters, numbers, function keys F1-F12, Esc, etc.) as part of the (future) hotkey system, often in conjunction with modifiers (Ctrl, Alt, Shift).

- **Example Philosophy:**
  - `Q, W, E, R` row: Often used for primary abilities in games.
  - `A, S, D, F` row: Often used for common commands (Attack, Stop, Hold Position, etc.).
  - Number keys `1-0`: For selecting control groups.
  - `Esc`: To cancel current action, deselect, close dialogs/menus, or blur focus from an input.
- The specific mapping of these keys to Commander functions is TBD and will be designed with common keyboard accessibility patterns in mind, avoiding conflicts with OS or assistive technology shortcuts where possible, and allowing for user customization.

**25. REPEATING KEYS**

When a character key is held down, it will repeat according to the user's operating system settings. This applies to text input fields. Arrow keys also repeat for navigation within text or lists, or for adjusting values in custom controls (e.g., sliders). Modifier keys (Shift, Ctrl, Alt) do not repeat.

**(Page 18)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**26. TYPE AHEAD**

Type ahead (buffering of keyboard input when the application is temporarily busy) is generally handled by the underlying operating system and UI framework (Electron/React). Commander itself does not implement a custom type-ahead buffer. Users should experience standard type-ahead behavior. The application should strive to be responsive to prevent excessive buffering.

**27. BACKSPACE KEY**

The BACKSPACE key (or Delete key on some keyboards when deleting forwards) functions as per standard OS text editing conventions:

- If text is selected, pressing Backspace deletes the selected text.
- If no text is selected, Backspace deletes the character to the left of the caret.
- In contexts outside text editing (e.g., navigating a list where items can be deleted), Backspace might be assigned as a hotkey for a "delete selected item" action, but this requires careful design to avoid accidental deletions and should include a confirmation step if destructive.

**28. TAB KEY**

The TAB key is used for standard focus navigation:

- Moves focus between interactive UI elements (input fields, buttons, links, pane headers, custom controls) in a logical order as defined in Section 4.3.
- `Shift + TAB` moves focus in the reverse order.
- Within text areas (`Textarea`), TAB may insert a tab character. If so, users must be able to exit the textarea using another key combination (e.g., Ctrl+Tab, or Esc to blur and then Tab). Standard WAI-ARIA practices for text areas should be followed. Commander uses Shadcn UI components which generally follow these.

**29. RETURN (ENTER) KEY**

The RETURN (or ENTER) key has context-dependent behavior:

- **Chat Input (`ChatWindow.tsx`):** Pressing Enter sends the current message. Pressing `Shift + Enter` inserts a new line.
- **Form Fields:** May submit the form or move focus to the next field, depending on the form's design. Standard behavior is to submit if the form contains a single text input or if focus is on a submit button.
- **Dialogs/Modals:** Typically activates the default button (e.g., "OK", "Submit").
- **Selected Items:** May trigger a default action on a selected item in a list or menu (equivalent to a click).
- **Buttons and Links:** Activates the focused button or link.

**(Page 19)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**30. THE EDIT MENU (SYSTEM LEVEL)**

Commander relies on the standard Edit menu provided by Electron, which integrates with OS-level clipboard operations. These menu items must remain accessible and functional.

**30.1 Cut**
Removes the current selection from its location and places it onto the system clipboard. Standard keyboard shortcut (Ctrl/Cmd + X) and menu access apply.

**30.2 Paste**
Inserts the content of the system clipboard at the current caret position, or replaces the current selection if one exists. Standard keyboard shortcut (Ctrl/Cmd + V) and menu access apply.

**30.3 Copy**
Copies the current selection to the system clipboard without removing it from its original location. Standard keyboard shortcut (Ctrl/Cmd + C) and menu access apply.

**30.4 Undo**
Reverts the last user action, typically text editing operations. Standard keyboard shortcut (Ctrl/Cmd + Z) and menu access apply. The scope and granularity of Undo are generally managed by the individual UI components (e.g., text input fields). Application-wide Undo for pane manipulations or agent commands is not a current standard feature, but if implemented, it must be clearly communicated and accessible.

**(Page 20)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**31. UTILITY PANES**

Various panes within Commander serve utility functions, providing access to tools, information, or specific features.

- **NIP-28 Channel Pane (`Nip28ChannelChat.tsx`):** Displays and allows interaction with a Nostr public chat channel. Contains a chat window. Chat content must be accessible (see Section 8.3.1).
- **NIP-90 DVM Dashboard Pane (`Nip90Dashboard.tsx`):** Allows users to create NIP-90 job requests and view results/feedback from Data Vending Machines. Contains a request form (all form fields must be labeled and keyboard accessible) and an event list (list items must be keyboard navigable and selectable, with states announced to assistive technologies).
- **Chat Pane (Generic):** A general-purpose chat interface used for direct interaction with agents or other users (if applicable in future).
- **Chats List Pane (Conceptual):** Would list available NIP-28 channels or other chat threads. List items must be keyboard navigable and provide accessible names.
- **Changelog Pane (Conceptual):** Would display application update notes, structured with proper headings for easy navigation.
- **Inspector Pane (Future):** Would display detailed information and actions for a selected entity. Content must be structured semantically.

These utility panes adhere to the general pane behaviors outlined in Section 9 (draggable, resizable, activatable), including all keyboard accessibility requirements for these actions.

**32. THE SCRAP (SYSTEM CLIPBOARD)**

Commander uses the standard operating system clipboard for cut, copy, and paste operations. There is no application-specific "Scrap" or clipboard manager beyond this. All copyable content must be selectable via keyboard.

**33. USER PROFILE AND SETTINGS**

User-specific settings and preferences are managed by the application and must be accessible via keyboard.

**33.1 Language Settings**

- Commander supports internationalization (i18n) using `i18next`.
- Available languages are defined in `src/localization/langs.ts` (e.g., English, Portuguese (Brazil)).
- Users can switch the application language using the `LangToggle.tsx` component, which utilizes `src/helpers/language_helpers.ts`. This toggle must be keyboard accessible and announce its state.
- The selected language is persisted in `localStorage` under the key `lang`.

**33.2 Theme Settings (Forced Dark)**

- Commander currently enforces a **dark theme** application-wide.
- The native OS theme is set to dark via `nativeTheme.themeSource = "dark"` in `src/main.ts`.
- The `dark` class is applied to the HTML root element, and Tailwind CSS variables for the dark theme are used (defined in `src/styles/global.css`).
- The `ToggleTheme.tsx` component acts as an indicator of this forced dark mode rather than a toggle.
- Theme preference is technically persisted in `localStorage` under the key `theme` by `src/helpers/theme_helpers.ts`, but current logic always forces dark mode. Future development will include user-selectable themes, including a high-contrast option and potentially a light theme, to cater to different visual accessibility needs. (See Section 33.5)

**(Page 21)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**33.3 Pane Layout Persistence**
The state of panes (their IDs, types, titles, positions, sizes, and active status) is persisted in `localStorage` under the key `commander-pane-storage-v2`.

- This is managed by the `usePaneStore` using Zustand's `persist` middleware (`src/stores/pane.ts`).
- Upon application startup, the persisted layout is loaded. A `merge` function handles cases of missing or malformed persisted data, ensuring default panes (like the main NIP-28 channel) are present.
- The `ResetHUDButton.tsx` component allows users to reset the pane layout to the initial default state.

**33.4 Telemetry Settings**
Commander includes a `TelemetryService` for logging application events, warnings, errors, and feature usage.

- **User Control:** The system is designed to allow users to enable or disable telemetry (though the UI for this toggle is not explicitly detailed in the provided HUD components, the service supports `setEnabled`). This toggle MUST be easily discoverable and keyboard accessible.
- **Default Behavior:**
  - Development Mode: Logs to `console.log`.
  - Production Mode: Silent by default (would send to a backend if configured).
- **Logging:** All application-level diagnostics **MUST** use `TelemetryService.trackEvent()`. Direct use of `console.*` methods is disallowed except for temporary local debugging or specific internal service logging. (See `docs/AGENTS.md#11-logging-and-telemetry` and `docs/TELEMETRY.md`).
- **Persistence (Future):** `docs/TELEMETRY.md` suggests persistent storage for the enabled/disabled state using Electron settings API, which is a future enhancement over in-memory or `localStorage`.

    **33.5 Accessibility Settings (Future)**
    A dedicated section within User Settings will provide controls for accessibility-related preferences. All settings within this section MUST be keyboard accessible and clearly labeled, with changes providing immediate or clear feedback. These may include:
    - **Text Size:** Options to increase or decrease global UI font size, with changes reflowing content correctly.
    - **High-Contrast Mode:** A toggle to enable a theme with enhanced contrast ratios beyond the default dark theme, or a user-selectable choice of specific high-contrast themes.
    - **Reduced Motion:** An option to minimize or disable UI animations and transitions for users sensitive to motion. This should respect OS-level reduced motion settings if available.
    - **NUI Adjustments:** Controls for hand tracking sensitivity, gesture customization, or disabling NUI entirely.
    - **Keyboard Shortcut Customization:** Interface to view and remap hotkeys to avoid conflicts and suit user needs.
    - **Auditory Feedback Preferences:** Controls for enabling/disabling or adjusting volume of UI sounds.
    - **Focus Indicator Customization:** (Advanced) Options to change the appearance (color, thickness) of the keyboard focus indicator.

**(New sections for Commander's unique aspects begin here.)**

**(Page 22)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**34. VOICE COMMANDS**

Voice commands are envisioned as a key NUI modality for Commander, allowing users to interact with the application and command agents hands-free.

**34.1 Philosophy and Invocation (Future)**

- **Natural Language:** Voice commands should aim to support natural language phrases rather than rigid, predefined commands where feasible.
- **Activation:** A clear invocation method will be required (e.g., a wake word like "Commander..." or a dedicated push-to-talk hotkey/UI button). This is crucial to avoid accidental command execution and must be accessible.
- **Alternative to Physical Input:** Voice commands can serve as a valuable accessibility feature for users with motor impairments or those who cannot use hand tracking or keyboard/mouse effectively.
- **Feedback:**
  - **Visual:** The UI should provide clear visual feedback when it is listening for voice input (e.g., a microphone icon changing state, with sufficient contrast).
  - **Auditory:** Confirmation sounds or voice responses may be used to indicate command understanding or execution status. These must be configurable.
  - **Textual:** A transcript or textual confirmation of recognized commands should be available for users who are deaf or hard of hearing, or who prefer visual confirmation.
- **Context-Sensitivity:** Available voice commands may change based on the active pane, selected agent, or current application state. This context should be clearly communicated.
- **Error Recovery & Clarity:** Clear mechanisms for correcting misrecognized commands (e.g., "cancel that," "try again") and unambiguous feedback are essential. Users should be able to easily exit voice input mode.

**34.2 Available Commands (Future - Illustrative Examples)**
The specific set of voice commands is TBD. Potential commands could include:

- "Commander, open chat with Agent X."
- "Commander, show NIP-90 dashboard."
- "Commander, Agent Y, perform action Z with parameter P."
- "Commander, what is my Bitcoin balance?"
- "Commander, drag current pane to the right." (If hand-free pane manipulation is desired)
- "Commander, enable/disable hand tracking."
- "Commander, read active pane content." (Example accessibility command)

_(Detailed specification of voice commands, grammar, and feedback mechanisms will be defined in a future revision of this document, with accessibility as a core consideration.)_

**35. NOSTR INTEGRATION**

Commander integrates several Nostr Implementation Possibilities (NIPs) to facilitate decentralized communication, identity, and service interaction. Services for these are defined in `src/services/`. UI elements related to Nostr features must be accessible.

**35.1 NIP-04 Encrypted Direct Messages**

- Used for secure, private communication, potentially between the user and agents, or user-to-user if such features are added.
- `NIP04Service` (`src/services/nip04/`) handles encryption and decryption of message content.
- The `createNip90JobRequest` helper uses NIP-04 to encrypt job inputs and parameters sent to Data Vending Machines.
- Channel messages in NIP-28 are also encrypted using NIP-04 to the channel creator's public key.
- UI for sending/receiving DMs must be accessible, with clear indication of encryption status.

**(Page 23)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**35.2 NIP-19 Identifiers**

- Bech32-encoded entities (`npub`, `nsec`, `note`, `nprofile`, `nevent`, `naddr`) are used for user-friendly display and input of keys and event identifiers.
- `NIP19Service` (`src/services/nip19/`) handles encoding and decoding of these identifiers.
- Displayed in UI elements like `Nip90EventList.tsx` for event IDs and pubkeys. These identifiers must be selectable and copyable via keyboard. Long identifiers should be presented in a way that doesn't break layout, possibly with truncation and a tooltip/button to reveal the full ID.

**35.3 NIP-28 Public Chat Channels**

- Commander supports interaction with NIP-28 public chat channels.
- `NIP28Service` (`src/services/nip28/`) manages channel creation (Kind 40), metadata updates (Kind 41), sending/receiving encrypted messages (Kind 42), and (future) moderation events (Kind 43, 44).
- The primary chat interface in the default HUD layout is a NIP-28 channel pane (`src/components/nip28/Nip28ChannelChat.tsx`). Chat accessibility standards apply (see Section 8.3.1).
- Users can create new NIP-28 channels via the `NewChannelButton.tsx` in the HUD.

**35.4 NIP-90 Data Vending Machines (DVMs)**

- Commander allows users to request on-demand computation from DVMs.
- `NIP90Service` (`src/services/nip90/`) handles the creation of job requests (Kind 5xxx), fetching job results (Kind 6xxx), and job feedback (Kind 7000).
- Inputs and parameters for DVM jobs can be NIP-04 encrypted for privacy, targeting a specific DVM's public key.
- The `Nip90Dashboard.tsx` pane provides the UI for interacting with DVMs, including a form to create requests (`Nip90RequestForm.tsx`) and a list to view events (`Nip90EventList.tsx`). All form elements MUST be labeled and keyboard accessible. The event list must be navigable via keyboard, and job statuses clearly indicated and announced to assistive technologies.

**(Page 24)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**36. BITCOIN INTEGRATION (SPARK SDK)**

Commander aims to integrate Bitcoin transactions, allowing users to "earn bitcoin" by providing compute via agents (as per `docs/transcripts/ep174.md`) and potentially make payments. This is facilitated by the Spark SDK.

- **Service:** `SparkService` (`src/services/spark/`) abstracts interactions with the Spark SDK.
- **Wallet Initialization:** The service initializes a `SparkWallet` using a mnemonic/seed (a development mnemonic is provided by default).
- **Functionality (exposed via `SparkService` interface):**
  - `createLightningInvoice`: To request Bitcoin payments via Lightning.
  - `payLightningInvoice`: To make Bitcoin payments via Lightning.
  - `getBalance`: To check the user's Bitcoin balance.
  - `getSingleUseDepositAddress`: To generate addresses for receiving on-chain Bitcoin.
- **UI (Future/Conceptual):**
  - The "Bitcoin Balance Display" (Section 8.3.4) would show the output of `getBalance`. This display must be clearly legible and its content available to screen readers.
  - Panes or dialogs would be needed for creating/paying invoices and managing wallet functions. These interfaces MUST be fully accessible, with clear labeling of amounts, addresses, fees, and action buttons. Confirmation steps for transactions are critical.
- **Error Handling:** Specific error types (e.g., `SparkConnectionError`, `SparkLightningError`) are defined for robust error management. Error messages MUST be presented in an accessible way (e.g., not just color-coded, but with clear text and ARIA alerts if appropriate).
- **Telemetry:** Spark service operations are tracked via the `TelemetryService`.

**37. AGENT INTERACTION MODEL**

The core purpose of Commander is to "Command agents, earn bitcoin." The UI must facilitate this effectively and accessibly.

- **Agent Representation (Conceptual):** Agents might be represented as entities within the HUD, possibly in a dedicated list pane or as icons. Selected agents could have their details and available commands shown in the Inspector pane. Agent representations must have accessible names and their states (e.g., busy, idle, error) must be perceivable through non-visual means as well.
- **Command Issuance:**
  - **Chat:** Users can command agents via natural language or structured commands in chat panes. The `ChatContainer` and `useChat` hook (interfacing with Ollama) form the basis for this. Chat accessibility is paramount.
  - **Direct Manipulation (Future NUI):** Hand gestures or direct interaction with agent representations in a 3D scene (if applicable) could issue commands. Keyboard/mouse alternatives are mandatory.
  - **Hotkeys (Future):** As per Section 4.2, efficient keyboard commands for agent control.
  - **Voice Commands (Future):** As per Section 34.
- **Feedback:** Agent status, task progress, and results of commands must be clearly communicated to the user. This includes:
    - Visually distinct updates with sufficient contrast.
    - Text-based messages in chat or status panes.
    - (Future) ARIA live regions or other non-intrusive announcements for screen readers for critical status changes or agent outputs. (See Section 39.3)
- **Earning Bitcoin:** The mechanism by which users earn Bitcoin through their agents (e.g., by selling spare compute via Ollama as a DVM service as hinted in `ep174.md`) needs to be clearly integrated into the agent interaction model and HUD, with earnings and related information presented accessibly.

_(Detailed specifications for agent representation and command ontologies are TBD and will be developed with accessibility in mind.)_

**(Page 25)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**38. TELEMETRY STANDARDS**

Commander incorporates a telemetry system (`src/services/telemetry/`) to gather anonymized usage data, aiding in the identification of issues and improvement of the user experience. Adherence to these standards is mandatory for all new feature development.

**Key Principles (from `docs/AGENTS.md` and `docs/TELEMETRY.md`):**

- **Centralized Service:** All application logging, event tracking, and diagnostics **MUST** use the `TelemetryService`.
- **User Control:** The `TelemetryService` supports `setEnabled` and `isEnabled` methods. UI controls MUST be provided to allow users to opt-in/out of telemetry. This control must be easily discoverable, clearly labeled, and keyboard accessible. (See Section 33.4).
- **Default Behavior:**
  - **Development Mode:** Logs events to `console.log` by default for visibility.
  - **Production Mode:** Silent by default (would transmit to a backend if configured). Telemetry should be opt-in by default, respecting user privacy.
- **No Direct `console.*` Usage:** Direct calls to `console.log()`, `console.warn()`, `console.error()`, etc., are **PROHIBITED** for application-level logging. They may only be used for temporary, local debugging and **MUST** be removed before committing code.
  - Exceptions: Internal logging within `TelemetryServiceImpl.ts` itself, specific fallback error handlers for telemetry failures, and test setup files.
- **Event Structure (`TelemetryEventSchema`):** Events tracked via `TelemetryService.trackEvent()` must conform to the schema:
  - `category`: (String) e.g., "ui", "navigation", "feature", "performance", "error", "log:info", "log:warn", "log:error", "log:debug".
  - `action`: (String) Specific action name, e.g., "button_click", "user_login_failure".
  - `label`: (Optional String) Contextual information.
  - `value`: (Optional String, Number, Boolean) Additional structured data (must be stringified if complex).
  - `timestamp`: (Optional Number) Defaults to `Date.now()`.
- **Error Handling:** The telemetry service uses Effect.js for typed error handling (e.g., `TrackEventError`). Calls to `trackEvent` should generally be fire-and-forget (e.g., using `Effect.ignoreLogged` or `Effect.runFork`) to not disrupt application flow.
- **Privacy:** Only anonymized data should be collected. No Personally Identifiable Information (PII) should be logged without explicit, informed consent and clear indication. The nature of data collected should be transparent to the user.
- **Transparency:** The telemetry system and data collection practices should be clearly documented for users (e.g., in a privacy policy or an "About Telemetry" section in settings).

**(Page 26)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**39. ACCESSIBILITY AND INCLUSIVITY STANDARDS**

Commander is committed to creating an inclusive experience that is accessible to the widest possible audience, regardless of ability or technology. These standards are intended to guide development towards this goal.

**39.1 Core Principles (WCAG)**
Commander aims to adhere to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as a minimum baseline. Development and design should be guided by the four POUR principles:

- **Perceivable:** Information and user interface components must be presentable to users in ways they can perceive. This means users must be able to perceive the information being presented (it can't be invisible to all of their senses).
    - Provide text alternatives for non-text content (e.g., icons, images).
    - Provide captions and other alternatives for multimedia if used.
    - Create content that can be presented in different ways, including by assistive technologies, without losing meaning.
    - Make it easier for users to see and hear content (e.g., contrast, text size, clear audio).
- **Operable:** User interface components and navigation must be operable. This means users must be able to operate the interface (the interface cannot require interaction that a user cannot perform).
    - Make all functionality available from a keyboard.
    - Give users enough time to read and use content.
    - Do not use content that causes seizures or physical reactions (avoid flashing content or provide warnings/controls).
    - Help users navigate and find content with clear structure and navigation mechanisms.
    - Make it easier to use inputs other than keyboard (NUI, voice, mouse).
- **Understandable:** Information and the operation of user interface must be understandable. This means users must be able to understand the information as well as the operation of the user interface (the content or operation cannot be beyond their understanding).
    - Make text readable and understandable using clear language.
    - Make content appear and operate in predictable ways.
    - Help users avoid and correct mistakes with clear error messages and undo functionality where appropriate.
- **Robust:** Content must be robust enough that it can be interpreted reliably by a wide variety of user agents, including assistive technologies. This means that as technologies and user agents evolve, the content should remain accessible.
    - Maximize compatibility with current and future user agents, including assistive technologies, by adhering to web standards and ARIA practices.

**39.2 Keyboard Accessibility**
(Reference Section 4.3 for detailed keyboard navigation and interaction standards).
Key tenets include:
- All interactive elements MUST be focusable and operable via keyboard.
- A logical tab order and visible focus indicator (meeting contrast requirements) MUST be maintained.
- No keyboard traps.
- Standard activation keys (Enter, Space) MUST function as expected for relevant controls.

**39.3 Screen Reader Support (ARIA)**
To ensure compatibility with screen readers and other assistive technologies:
- Use semantic HTML elements wherever possible to provide inherent accessibility.
- For custom components and dynamic content, utilize Accessible Rich Internet Applications (ARIA) roles, states, and properties appropriately.
    - **Roles:** Define the purpose of a component (e.g., `role="button"`, `role="dialog"`, `role="tablist"`, `role="tab"`, `role="tabpanel"`).
    - **States & Properties:** Communicate the current condition or characteristics of an element (e.g., `aria-pressed="true"`, `aria-expanded="false"`, `aria-label="Close"`, `aria-disabled="true"`, `aria-selected="true"`).
- All images, icons, and non-text content that convey meaning MUST have appropriate text alternatives (e.g., `alt` text for images, `aria-label` for iconic buttons). Decorative elements should be hidden from assistive technologies (e.g., `aria-hidden="true"` or empty `alt=""`).
- Dynamic content updates (e.g., chat messages, status updates, notifications) SHOULD use ARIA live regions (`aria-live="polite"` or `aria-live="assertive"` as appropriate, `aria-atomic`, `aria-relevant`) to inform users of changes without unnecessarily shifting focus.
- Ensure accessible names and descriptions for all interactive controls, especially those without visible text labels.
- Follow ARIA design patterns for common widgets like menus, dialogs, tabs, etc.

**(Page 27)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**39.4 Visual Accessibility (Color, Contrast, Text)**
(Reference Sections 1.3 and 1.4 for theme, appearance, and typography standards).
Key tenets include:
- **Contrast:** Adherence to WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text/UI components and graphical objects). This applies to text on background, borders of components, focus indicators, and meaningful graphical elements.
- **Color:** Color MUST NOT be the sole means of conveying information, indicating status, or prompting action. Alternative visual cues (patterns, icons, text, shape) must be provided.
- **Text:** Use legible fonts, adequate default sizing, and support for text scaling up to 200% via browser zoom or application settings without loss of content or functionality.
- **Layout:** Ensure layouts are responsive and content reflows without requiring two-dimensional scrolling when zoomed or text size is increased. Maintain readability and operability at different zoom levels.

**39.5 Interaction Modality Alternatives**
Commander's NUI-first approach must be balanced with robust alternatives to ensure no user is excluded:
- All functionality available via NUI (hand tracking, future voice commands) MUST also be fully available and operable via keyboard AND mouse/trackpad.
- Users MUST be able to disable or ignore NUI features without loss of core functionality.
- (Future) Voice commands will offer another alternative interaction method, supplementing, not replacing, other accessible methods.

**39.6 User-Configurable Options**
(Reference Section 33.5 for future accessibility settings).
Commander will strive to provide users with options to customize their experience for better accessibility. These settings should be easy to find and use. This includes:
- Text size adjustments.
- High-contrast mode(s).
- Reduced motion options.
- NUI sensitivity and customization, including the option to disable.
- Keyboard shortcut customization and viewing.
- Control over auditory feedback.

**39.7 Testing and Validation**
Accessibility is an ongoing process and requires regular testing and validation:
- Regular accessibility testing MUST be part of the development lifecycle, from design to release.
- Testing should include a combination of:
    - Automated accessibility testing tools (e.g., Axe, Lighthouse).
    - Manual keyboard-only testing (navigating and operating all features).
    - Testing with various screen readers (e.g., NVDA on Windows, VoiceOver on macOS, JAWS if possible).
    - Browser zoom functionality testing up to 200-400%.
    - Color contrast checking tools for all UI elements and states.
    - Checking for reflow issues with increased text size/zoom.
- Code reviews should include checks for accessibility best practices (semantic HTML, ARIA usage).
- (Future) Involving users with a diverse range of disabilities in testing and feedback sessions is highly encouraged to gain real-world insights and ensure usability.

---

**(Page 28)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Screenshots**

_(This section would typically contain visual mockups or screenshots illustrating the UI standards. As this is a text-based generation, conceptual descriptions are provided.)_

**Figure 1: Main HUD Layout**
_Description:_ A full-screen view showing the `SimpleGrid` background. Several panes are open and arranged:
_ A NIP-28 Channel Chat pane (`nip28_channel`) is prominent, perhaps slightly larger and centered, showing active conversation. This is the `DEFAULT_NIP28_PANE_ID`.
_ A NIP-90 DVM Dashboard pane (`nip90_dashboard`) is open to one side, displaying a list of job requests.
_ (Conceptual) An Inspector Pane is docked to the bottom-right, showing details of a (hypothetically) selected agent or item.
_ (Conceptual) A Hotbar is visible at the bottom-center with several iconic buttons.
_ (Conceptual) A Bitcoin balance display is in the top-right corner.
_ The Hand Tracking Toggle, New Channel Button, NIP-90 Dashboard Button, and Reset HUD Button are visible in their fixed positions at the bottom of the screen.
_ All panes and HUD elements adhere to the dark theme. The active pane (e.g., the NIP-28 chat) has a highlighted border that is distinguishable by more than just color (e.g., thickness).
_ _All text elements shown would meet contrast requirements. Focus order through interactive elements (buttons, pane headers) would be logical and visually indicated._

**Figure 2: Pane Interaction - Dragging**
_Description:_ Shows a mouse cursor dragging the title bar of a pane. A faint outline or visual cue indicates the pane is being moved. Alternatively, shows a hand in a `PINCH_CLOSED` gesture over a pane's title bar, with the pane slightly offset, indicating it's being dragged by hand. _If keyboard dragging is active, the pane title bar would show a clear focus indicator, and visual feedback (e.g., position numbers) would update._

**Figure 3: Pane Interaction - Resizing**
_Description:_ Shows a mouse cursor over one of the eight resize handles on a pane's border. The cursor is changed to the appropriate resize arrow (e.g., `ew-resize`). The pane's border might show a visual cue that it's being resized. _Resize handles or the pane itself would be focusable for keyboard resizing, with clear instructions or cues._

**Figure 4: Chat Window (`ChatWindow.tsx`)**
_Description:_ Close-up of a chat pane.
_ Shows a list of messages (`ChatMessage.tsx`) with alternating alignment for "user" and "assistant" roles. System messages are centered and italicized. Timestamps and author names are visible.
_ An assistant message shows a "streaming" indicator (`▋` and `Loader2` icon), which should be conveyed to screen readers if it indicates a loading state.
_ A multi-line `Textarea` is at the bottom for user input, with a "Send" button. _Input area would have an associated label for screen readers (e.g., `aria-label="Type your message"`). Messages would be structured semantically (e.g., in a list or using appropriate ARIA roles) for screen reader navigation._
_ Custom scrollbars are visible if messages overflow and are keyboard operable.

**Figure 5: Hand Tracking Visualization (Debug/Development View)**
_Description:_ An overlay showing the live camera feed (mirrored) with MediaPipe hand landmarks and connections drawn on detected hands.
_ One hand is performing a `PINCH_CLOSED` gesture, and a circle with coordinates is drawn at the pinch midpoint.
_ The other hand is in an `OPEN_HAND` pose.
_ Text overlays indicate "Status: 2 hand(s) detected" and the recognized pose for each hand. Text must be high contrast.
_ This view is primarily for development and debugging hand tracking accuracy and pose recognition. _Normal operation would not rely on this visual feedback for NUI interactions; alternative feedback mechanisms are key._

**Figure 6: NIP-90 DVM Dashboard Pane**
_Description:_ The NIP-90 Dashboard pane is active.
_ The top section shows the `Nip90RequestForm.tsx` with fields for Job Kind, Input Data, Output MIME Type, and Bid Amount, along with a "Publish Encrypted Job Request" button. _Form fields would be properly labeled (e.g., using `<label for="...">` or `aria-labelledby`), have visible focus states, and validation errors would be announced accessibly._
_ The bottom section shows `Nip90EventList.tsx`, a scrollable list of NIP-90 job request event cards. Each card displays the event ID (note1...), kind, creator (npub1...), creation date, and a button to "Load Results". One card is expanded, showing job results and feedback. _The event list would be keyboard navigable (e.g., up/down arrows), and each item selectable/activatable with Enter/Space. Screen reader announcements would convey job statuses or updates dynamically (e.g., via ARIA live regions)._

**(Further figures would detail other specific UI states, dialogs, or interactions as the application evolves, each with accessibility considerations noted.)**

---

```
“DTCCOMMDOC-420-1-23.PICT” 247 KB 2001-05-04 dpi: 300h x 300v pix: 1899h x 3215v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0030 of 0030
```

---

This document provides a foundational UI standard for Commander, with a strong emphasis on accessibility and inclusivity. It will be a living document, updated iteratively as new features are developed and existing ones are refined based on user feedback, NUI best practices, and evolving accessibility guidelines.Okay, I've updated the relevant sections of your Commander UI Standards Document to incorporate accessibility and inclusive design principles.

Here are the updated sections:

---

**Commander UI Standards**

**Document#** `001`

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
|  OpenAgents Team - Accessibility Update                 |
+---------------------------------------------------------+
                                                 30 pages
*********************************************************************************
                        OpenAgents Inc.
             Innovating the Future of Agent Interaction
      (contact@openagents.com) - Committed to Accessibility
*********************************************************************************
```

## **Commander**

---

```
“DTCCOMMDOC-420-0-00.PICT” 154 KB 2001-05-03 dpi: 300h x 300v pix: 1795h x 2707v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0001 of 0030
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
“DTCCOMMDOC-420-0-01.PICT” 149 KB 2001-05-03 dpi: 300h x 300v pix: 2091h x 2979v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0002 of 0030
```

---

**(Page 3: Quick Overview)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Quick Overview of Key Design Principles & Departures from Traditional UIs:**

1.  **NUI First, Inclusive by Design:** Commander prioritizes Natural User Interfaces (hand tracking, future voice commands) as primary interaction modalities, while ensuring robust alternative input methods (keyboard, mouse) for full accessibility.

2.  **Dynamic Pane-Based Workspace:** The primary user workspace is composed of draggable, resizable, and dynamic panes, allowing for a highly customizable and fluid information layout, manageable via keyboard and other assistive technologies.

3.  **Integrated Agent Command & Control:** The user interface is fundamentally designed around the concept of commanding and interacting with AI agents, with clear and accessible feedback mechanisms.

4.  **Direct Bitcoin Integration:** The application features direct integration of Bitcoin functionalities, making earning and (future) payments a core part of the user experience, with accessible transaction information.

5.  **Immersive & Perceivable HUD-Style Interface:** Commander employs a game-like Heads-Up Display (HUD) providing an immersive environment, designed with clear information hierarchy, sufficient contrast, and perceivable feedback for agent control and monitoring.

6.  **Advanced & Accessible Keyboard Control:** Commander implements comprehensive keyboard support, including standard navigation and a sophisticated system of hotkeys (StarCraft-inspired), ensuring all functionality is operable via keyboard for efficiency and accessibility.

7.  **Consistent Dark Theme with Accessibility Focus:** The application enforces a dark theme with carefully chosen color palettes ensuring sufficient contrast ratios (aiming for WCAG AA). Future iterations will explore user-configurable high-contrast modes and other visual accessibility options.

8.  **Telemetry for Continuous Improvement:** User-configurable telemetry is integrated to gather anonymized usage data, guiding iterative development and enhancement of the user experience, with a strong emphasis on privacy.

9.  **Modular and Service-Oriented Architecture:** Built with modern technologies like Effect-TS, enabling robust and maintainable integration of complex features like Nostr protocols and AI services.

10. **Commitment to Accessibility Standards:** Commander is designed and developed with a commitment to accessibility, aiming to meet or exceed Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, ensuring usability for people with diverse abilities. (See Section 39)

Also several minor changes and many clarifications.

---

```
“DTCCOMMDOC-420-0-02.PICT” 55 KB 2001-05-03 dpi: 300h x 300v pix: 2079h x 1232v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0003 of 0030
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
   3.5 Accessibility Considerations for NUI ............... 4
4. Keyboard .............................................. 5
   4.1 Standard Text Input ................................ 5
   4.2 Hotkeys & Keybindings (StarCraft Style Philosophy) . 5
   4.3 Keyboard Navigation and Interaction Standards ...... 5
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
   9.5 Moving a Pane (Mouse, Hand, Keyboard) .............. 10
   9.6 Resizing a Pane (Mouse, Keyboard) .................. 11
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
    33.5 Accessibility Settings (Future) ................. 21
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
39. Accessibility and Inclusivity Standards ............ 26
    39.1 Core Principles (WCAG) ........................ 26
    39.2 Keyboard Accessibility ........................ 26
    39.3 Screen Reader Support (ARIA) .................. 26
    39.4 Visual Accessibility (Color, Contrast, Text) .. 27
    39.5 Interaction Modality Alternatives ............. 27
    39.6 User-Configurable Options ..................... 27
    39.7 Testing and Validation ........................ 27

Screenshots .............................................. 28
Last pages: 30
```

---

```
“DTCCOMMDOC-420-0-03.PICT” 196 KB 2001-05-03 dpi: 300h x 300v pix: 1928h x 2895v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0004 of 0030
```

---

**(Page 5 starts the detailed sections)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**COMMANDER USER INTERFACE STANDARDS DOCUMENT**

**Product Name: Commander**
**21 May 2025**

**0. INTRODUCTION**

The Commander User Interface has two main goals: simplicity and power, **underpinned by a commitment to inclusivity and accessibility.** We want Commander to be easy to learn and intuitive to use **for everyone**, so we try to do things in a simple and natural manner and to build on concepts already familiar to users from gaming and advanced computing environments. An integrated system with a consistent **and accessible** user interface is easier to learn and to use. An integrated system is also more powerful than a group of separate programs that don't interact.

This Commander User Interface Standards Document presents the external view of what Commander looks like to the user and expresses a set of guidelines that the Commander development team will use in an effort to achieve that simplicity, power, **and broad accessibility.**

We want all Commander-integrated applications and agent interactions to have the same "feel" to the user, so that learning is minimized when going from application to application. Where possible, the same operation in two programs should be done in the same way and behave the same to the user. A given user action should have a consistent meaning throughout the system. Principles used in constructing system features **must be extensible and robust, considering diverse user needs and assistive technologies,** in order to minimize user frustration.

It is hoped that outside vendors and community contributors will find it to their advantage to use these conventions as well.

**1. DISPLAY**

**1.1 Main Window**
Commander runs within a standard Electron application window. The application aims for a full-screen, immersive experience. The default window size is 1200x800 pixels but is resizable by the user. For a frameless appearance and custom control, the main window uses `titleBarStyle: 'hidden'` on macOS or equivalent custom framing on other platforms. A custom draggable region is provided at the top of the application, integrated into the HUD. (See `src/components/DragWindowRegion.tsx` and IPC helpers in `src/helpers/ipc/window/`).

**1.2 Heads-Up Display (HUD)**
The primary interaction paradigm is a Heads-Up Display. This HUD consists of:

- A full-screen dynamic background, often a 3D scene rendered with `@react-three/fiber` (e.g., `SimpleGrid.tsx`, `PhysicsBallsScene.tsx`).
- A system of draggable and resizable panes for displaying content and interacting with agents (see Section 9. Panes).
- Fixed HUD elements for common actions and information display (see Section 8.3).

The HUD is designed to be immersive and provide immediate access to command and control functions, while ensuring all information is perceivable and operable through various means.

**(Page 6)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**1.3 Theme and Appearance**
Commander enforces a **dark theme** to maintain a consistent and focused aesthetic. This is set at the Electron nativeTheme level (`nativeTheme.themeSource = "dark"`) and applied globally using Tailwind CSS v4 and custom CSS variables. This theme is designed to meet WCAG 2.1 Level AA contrast ratios for text and interactive elements against their backgrounds.

- **Background:** Predominantly black or very dark gray (`--background: oklch(0.1 0 0)`).
- **Foreground:** Predominantly white or light gray for text and primary UI elements (`--foreground: oklch(0.9 0 0)`).
- **Accent Colors:** Used sparingly for active states or highlights (e.g., blue for active pane borders), ensuring they meet contrast requirements when conveying information.
- **Contrast:** All UI text and graphical elements critical for understanding content or operating functionality MUST maintain a minimum contrast ratio of 4.5:1 (for normal text) or 3:1 (for large text and graphical objects/UI components) against their immediate background. Tools like a contrast checker MUST be used during design and development.
- **Color Use:** Color MUST NOT be used as the sole means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. Alternative visual cues (e.g., icons, text labels, underlines, shape changes) MUST be provided.
- **Styling:** UI components are primarily styled using Shadcn UI and Tailwind CSS utility classes. Custom styles are defined in `src/styles/global.css`.

The `ToggleTheme.tsx` component currently acts as an indicator of the forced dark mode rather than a functional toggle. While user control over themes is not a current primary feature, future iterations will explore options such as a high-contrast mode and light theme alternatives to cater to a wider range of visual preferences and needs. Theme state is managed via `src/helpers/theme_helpers.ts` and IPC.

**1.4 Typography**
The primary font used throughout the Commander application is **Berkeley Mono**. This monospaced font is applied globally for UI text, chat messages, and other content to reinforce the "commander" and technical aesthetic. This font has been chosen for its clarity and legibility in a technical context. Font definitions are in `src/styles/fonts.css` and applied via `src/styles/global.css`.

- **Font Size:** Default font sizes MUST be sufficient for readability (e.g., minimum 12-14pt equivalent for body text, depending on context and viewing distance assumptions for a HUD).
- **Text Scaling:** The UI MUST support text scaling up to 200% without loss of content or functionality, and without requiring horizontal scrolling for full lines of text. This can be achieved through browser zoom or application-specific settings (future).
- **Line Spacing (Leading) and Spacing:** Sufficient line spacing (at least 1.5 times the font size) and paragraph spacing (at least 2 times the font size) should be used for blocks of text to improve readability. Letter spacing (tracking) and word spacing must also be adequate.
- **Text on Images/Complex Backgrounds:** If text is rendered over images or dynamic backgrounds, it MUST have a solid or sufficiently opaque backing, or a text shadow/outline, to ensure contrast requirements are met.

**2. MOUSE AND CURSOR**

Pointing to things on the screen is done with a mouse (or trackpad/equivalent). The mouse is a small, hand-sized object which is free to be rolled on a flat, horizontal surface. Motion of the mouse to right or left moves a cursor on the screen to right or left, respectively. Moving the mouse away from the user moves the cursor upward, and moving the mouse toward the user moves the cursor downward. When cursor reaches the edge of the screen it remains pinned to the edge although it may move along the edge, until the appropriate x component of the mouse's motion is reversed, at which moment the cursor begins to move again.

**Accessibility Considerations:**
- While the mouse is a supported input method, all functionalities achievable by mouse interaction MUST also be fully operable via keyboard (see Section 4 and 39.2) and, where appropriate, NUI (Section 3) or Voice Commands (Section 34). No functionality should be exclusively mouse-dependent.
- Cursor changes that convey information (e.g., resize arrows, grab hand) MUST have alternative non-visual cues for users who cannot see the cursor or its shape. For custom interactive elements, ARIA attributes should be used to describe the element's role and state (see Section 39.3).

Within Commander:

- The standard operating system cursor is used.
- The mouse is the primary input for interacting with traditional UI elements (where applicable, though minimized in favor of NUI).
- **Pane Interaction:** The mouse is a primary method for dragging panes by their title bars and resizing panes using their resize handles. This is facilitated by the `@use-gesture/react` library in `src/panes/Pane.tsx`.
- **Clicking:** Standard mouse clicks are used to activate buttons, select items in lists, and interact with content within panes.
- **Scrolling:** Mouse wheel scrolling is supported for scrollable content areas within panes.

The cursor may take on different shapes to indicate its current function. For example, when hovering over resize handles of a pane, the cursor changes to the appropriate resize arrow. When hovering over a draggable title bar, it changes to a grab hand.

The mouse system incorporates a button on its top surface that allows the user to signal a particular position on the screen to the computer. The system is always aware of the position indicated by the mouse. When the button is up, motion of the mouse causes cursor motion and may change the shape of the cursor, but no other changes occur to anything on the screen as a result of the motion.

**(Page 7)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**3. HAND TRACKING (NUI)**

Commander embraces Natural User Interface (NUI) principles, with hand tracking as a core interaction modality.

**3.1 Overview and Technology**
Hand tracking is implemented using the MediaPipe Hands library. The `useHandTracking` hook (`src/components/hands/useHandTracking.ts`) manages the camera feed (via a hidden `<video>` element) and processes hand landmarks.

- A `landmarkCanvasRef` is used to draw detected hand landmarks for debugging or visual feedback, though this is typically overlaid and can be made invisible in production.
- The system supports tracking up to two hands (`maxNumHands: 2`).
- Handedness ("Left" or "Right") is detected for each tracked hand.

**3.2 Hand Pose Recognition**
A dedicated module, `src/components/hands/handPoseRecognition.ts`, is responsible for interpreting hand landmarks to recognize a set of predefined hand poses.

- **Supported Poses (defined in `src/components/hands/handPoseTypes.ts`):**
  - `FIST`: All fingers curled, thumb potentially across fingers.
  - `TWO_FINGER_V`: Index and middle fingers extended and spread, other fingers curled.
  - `FLAT_HAND`: All fingers extended and relatively close together.
  - `OPEN_HAND`: All fingers extended and spread wide.
  - `PINCH_CLOSED`: Thumb tip and index fingertip are close together.
  - `NONE`: No specific pose detected or no hand tracked.
- Pose recognition logic uses Euclidean distances between landmarks and relative landmark positions. Thresholds for pose detection (e.g., pinch distance) are defined and may be subject to tuning.

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

- **Landmark Canvas:** `landmarkCanvasRef` in `useHandTracking` draws hand connections and landmarks. Key landmarks (thumb tip, index tip) are highlighted. Pinch midpoints can also be visualized with coordinates for debugging. This canvas is typically mirrored like the video feed.
- **Dynamic Pointer (3D):** `src/components/hands/DynamicPointer.tsx` renders an invisible `RigidBody` in a 3D physics scene that follows the primary hand's position (typically index finger tip). This allows physical interaction with other 3D objects in the scene.

    **3.5 Accessibility Considerations for NUI**
    While NUI is a primary interaction modality, it is not suitable for all users.
    - **Alternative Inputs:** All actions performable via hand tracking MUST have equivalent keyboard and mouse/trackpad alternatives. Voice commands (future) will provide another alternative. (See Sections 2, 4, 34, and 39.5)
    - **No NUI-Exclusive Functionality:** No feature or information should be exclusively accessible or operable through hand tracking.
    - **User Configuration:** (Future) Users should be able to:
        - Adjust sensitivity and thresholds for pose recognition to accommodate varying motor abilities.
        - Disable hand tracking entirely if it interferes with other assistive technologies or user preferences.
        - Customize gesture mappings if defaults are problematic. (See Section 33.5)
    - **Clear Feedback:** Visual feedback for hand tracking (landmarks, pointer) should be clear, but also consider that some users may have the visual feedback turned off or may not be able to see it. Application state changes due to NUI input should be perceivable through other means (e.g., auditory cues, clear changes in UI elements).
    - **Avoid Fatigue:** Interactions requiring prolonged or precise hand poses should be designed with care to minimize physical strain. Quick, distinct gestures are preferred over sustained holds where possible for critical or frequent actions.

**(Page 8 is where the COMM doc starts section 4. KEYBOARD. We'll continue adapting)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**4. KEYBOARD**

The keyboard is a fundamental input method for Commander, crucial for both power users and accessibility.

**4.1 Standard Text Input**
The keyboard is used for standard text input in components such as the Chat window (`src/components/chat/ChatWindow.tsx`) and various input fields throughout the application (e.g., NIP-90 request form).

- Standard OS-level text editing capabilities (selection, copy, paste, undo) are expected to function normally within these text input areas.
- The "Enter" key is used to send messages in the chat window, while "Shift+Enter" creates a new line.
- All text input fields MUST be accessible via keyboard, support standard editing commands, and be clearly labeled (e.g., using `<label>` for HTML inputs, or `aria-labelledby` for custom components, ensuring association for assistive technologies).

**4.2 Hotkeys & Keybindings (StarCraft Style Philosophy)**
Commander aims to provide an advanced and efficient control scheme for power users through a system of hotkeys and keybindings, drawing inspiration from Real-Time Strategy (RTS) games like StarCraft. This system is a future development goal and its full specification is pending.

**Core Principles:**

- **Efficiency:** Hotkeys should provide faster access to frequently used commands and agent interactions than NUI or mouse-based methods.
- **Memorability & Learnability:** While comprehensive, the system should be designed with logical groupings and mnemonic aids to facilitate learning. (Future) An accessible in-app guide or help section detailing all hotkeys should be provided.
- **Context-Sensitivity:** Hotkeys may vary depending on the active pane or selected agent/element.
- **Customization:** (Future) Users MUST be able to customize keybindings to avoid conflicts with assistive technology or OS-level shortcuts, and to suit their personal preferences or physical needs. The ability to disable specific hotkeys should also be considered. (See Section 33.5)
- **Standard Operations:** Common operations like selecting agents, issuing commands (move, attack, build – metaphorically for agents), cycling through units/panes, and accessing specific UI elements (e.g., opening the NIP-90 dashboard) will be candidates for hotkeys.
- **Modifier Keys:** Ctrl, Shift, Alt (Cmd on macOS) will be used in combination with letter/number keys to expand the range of available commands, similar to RTS control group management or ability modifiers.
- **Feedback:** Clear visual or auditory feedback should be provided when hotkeys are activated.

_(Detailed specification of hotkeys is TBD and will be added in a future revision of this document.)_

    **4.3 Keyboard Navigation and Interaction Standards**
    Beyond hotkeys, comprehensive keyboard navigation is paramount for accessibility. (See also Section 39.2)
    - **Focus Management:**
        - All interactive UI elements (buttons, links, input fields, pane headers, custom controls) MUST be focusable using the Tab key (and Shift+Tab for reverse).
        - A logical and predictable focus order MUST be maintained. Navigation flow should generally follow the visual layout (e.g., left-to-right, top-to-bottom within a pane, then to next pane or global controls).
        - Upon opening dialogs, modals, or new panes that take primary interaction focus, keyboard focus MUST be programmatically moved to an element within that new context.
        - When a dialog or modal is closed, focus MUST return to the element that triggered its opening, or a logical preceding element.
    - **Visible Focus Indicator:** A highly visible focus indicator MUST be present on the element that currently has keyboard focus. This indicator must have sufficient contrast against its background and surrounding elements (meeting 3:1 contrast ratio). Standard browser outlines should be preserved or enhanced, not suppressed without a clear, equally accessible replacement.
    - **Component-Level Interaction:**
        - Standard HTML controls (buttons, inputs, etc.) should be used where possible to leverage built-in keyboard accessibility.
        - Custom components (e.g., pane manipulation, HUD elements) MUST implement appropriate keyboard interaction patterns (e.g., arrow keys for navigating within a component or adjusting values, Enter/Space to activate, Esc to dismiss). ARIA design patterns should be followed.
    - **No Keyboard Traps:** Users MUST be able to navigate into and out of all sections of the UI using only the keyboard. Focus should not become trapped within any component from which the user cannot escape using Tab, Shift+Tab, or Esc as appropriate.
    - **Activation:** Interactive elements such as buttons MUST be activatable using both Enter and Space keys. Links are typically activated with Enter.
    - **ARIA Attributes:** Appropriate ARIA roles, states, and properties MUST be used to make custom controls understandable and operable by assistive technologies (see Section 39.3).

**5. SYSTEM STATE AND PERSISTENCE**

Commander persists certain aspects of its state to enhance user experience across sessions.

- **Pane State:** The layout of panes (positions, sizes, types, active state) is persisted using Zustand's `persist` middleware with `localStorage`. This is managed in `src/stores/pane.ts`. The `merge` function attempts to gracefully handle persisted state, ensuring default panes like the NIP-28 channel are present.
- **User Preferences:**
  - **Language:** The selected application language is stored in `localStorage` and managed by `src/helpers/language_helpers.ts`.
  - **Theme:** While Commander currently enforces a dark theme, the mechanism for theme persistence via `localStorage` (`THEME_KEY`) exists in `src/helpers/theme_helpers.ts`.
  - **Telemetry:** User preference for enabling/disabling telemetry is persisted (see `docs/TELEMETRY.md`, though the PGlite-based persistence mentioned there is a future plan; current implementation likely uses `localStorage` or Electron settings API via `TelemetryServiceImpl.ts`).
  - **Accessibility Preferences (Future):** Persisted settings for font size adjustments, high-contrast mode selection, reduced motion preferences, NUI sensitivity levels, and custom keybindings. (See Section 33.5)
- **NIP-90 Request Data:** Ephemeral secret keys associated with NIP-90 job requests are stored in `localStorage` by `src/components/nip90/Nip90RequestForm.tsx` to allow decryption of DVM responses across sessions.
- **PGlite Database (Future):** `docs/pglite.md` outlines plans for local data persistence using PGlite, either in the main process (filesystem) or renderer (IndexedDB), potentially synchronized with ElectricSQL. This would be used for local-first data like messages, threads, and settings.

**(Page 9)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**6. INITIALIZATION**

Upon application startup, Commander initializes its UI and services:

1.  **Electron Main Process (`src/main.ts`):**
    - Creates the main `BrowserWindow`.
    - Forces the native OS theme to dark (`nativeTheme.themeSource = "dark"`).
    - Sets up webPreferences, including `contextIsolation: true` and the preload script (`src/preload.ts`).
    - Loads the renderer entry point (`index.html` -> `src/renderer.ts`).
    - Registers IPC listeners for window controls, theme management, and Ollama communication (`registerListeners` from `src/helpers/ipc/listeners-register.ts`).
    - Installs React DevTools in development.
2.  **Preload Script (`src/preload.ts`):**
    - Exposes specific IPC functionalities to the renderer process via `contextBridge` (`exposeContexts` from `src/helpers/ipc/context-exposer.ts`). This includes `window.electronAPI.ollama`, `window.themeMode`, and `window.electronWindow`.
3.  **Renderer Process (`src/renderer.ts` -> `src/App.tsx`):**
    - Initializes the main Effect runtime (`mainRuntime` from `src/services/runtime.ts`), which sets up all core services (Nostr, NIP-04/19/28/90, BIP39/32, Spark, Telemetry, Ollama, HttpClient).
    - Renders the root React component (`App`).
    - `App.tsx` initializes i18n, syncs the theme (forced dark), and sets up the TanStack Router.
4.  **Pane System (`src/stores/pane.ts`):**
    - The `usePaneStore` initializes with default panes, notably the main NIP-28 channel pane (`DEFAULT_NIP28_PANE_ID`), as defined in `getInitialPanes`.
    - Persisted pane layout from previous sessions is loaded and merged. Any persisted accessibility settings (future) would also be applied here.
5.  **HUD (`src/pages/HomePage.tsx`):**
    - Renders the `SimpleGrid` background and `PaneManager`.
    - Initializes hand tracking (if enabled by default, or upon user toggle).
    - Displays HUD control buttons (Reset, Hand Tracking Toggle, New Channel, NIP-90 Dashboard).

**7. EVERYDAY OPERATION**

The user interacts with Commander primarily through the HUD.

- **Information Display:** Panes display various types of information like chat messages, NIP-90 DVM interactions, agent statuses, and Bitcoin balance, ensuring text is legible and information is structured for clarity.
- **Interaction:**
  - **Mouse:** Used for clicking buttons, selecting text, dragging/resizing panes.
  - **Keyboard:** Used for text input (chat, forms), comprehensive UI navigation, pane manipulation, and (future) hotkeys for commands.
  - **Hand Tracking (NUI):**
    - Panes can be dragged using the `PINCH_CLOSED` gesture on their title bars.
    - Specific hand poses can trigger actions, e.g., controlling 3D scenes.
  - **Voice Commands (Future):** Intended to provide an alternative input modality for common commands.
- **Agent Commands:** Users command AI agents, presumably through chat interfaces within panes or dedicated agent control panes. The results of agent actions and earnings (Bitcoin) are displayed within the HUD using accessible feedback methods.
- **Pane Management:** Users can open new panes (e.g., new NIP-28 channels via `NewChannelButton.tsx`, NIP-90 dashboard via `Nip90DashboardButton.tsx`), close dismissable panes, and rearrange their workspace by dragging and resizing. All management functions must be keyboard accessible.
- **Settings:** Users can toggle hand tracking and (future) other preferences like telemetry and accessibility options (See Section 33). Language can be changed via `LangToggle.tsx`.

The overall flow is designed to be dynamic and responsive, allowing users to manage multiple information streams and agent interactions simultaneously, irrespective of their preferred input modality or abilities.

**(Page 10)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**8. WHAT THE SCREEN LOOKS LIKE (HUD LAYOUT)**

Commander presents a Heads-Up Display (HUD) that occupies the entire application window.

**8.1 Background Grid**
A subtle, static grid pattern (`src/components/home/SimpleGrid.tsx`) is rendered as the rearmost layer of the HUD. It provides a sense of space and a clean backdrop for other UI elements. The grid lines are `rgba(255, 255, 255, 0.05)` on a black background, with a cell size of 40x40 pixels. It is non-interactive (`pointer-events-none`). The grid's color and intensity MUST be subtle enough not to interfere with the legibility of foreground text and interactive elements. Contrast between the grid and key HUD elements must be considered.

**8.2 Pane Manager Area**
The main area of the HUD is managed by the `PaneManager` (`src/panes/PaneManager.tsx`), which renders all active panes. Panes can be freely moved and resized within this area and can overlap (see Section 9. Panes). The focus order among panes must be logical and controllable via keyboard.

**8.3 Core HUD Elements**
Several key informational and interactive elements are typically part of the HUD, often realized as panes or fixed components. All HUD elements, whether fixed or within panes, MUST have sufficient contrast. Iconic buttons or controls MUST have accessible names (e.g., via `aria-label` or visually hidden text) if their meaning is not clear from context or an adjacent visible label. (See Section 39.3)

    **8.3.1 Chat Window**
    A primary interaction point, styled reminiscent of World of Warcraft chat windows, typically positioned at the bottom-left. This is usually a specific pane type (e.g., `nip28_channel` or a generic `chat` pane).
    *   Implemented via `src/components/chat/ChatContainer.tsx` within a pane.
    *   Features message display area and a text input for sending messages. Text input must be labeled for assistive technologies. Chat messages should be structured semantically for screen reader navigation.

    **8.3.2 Hotbar (Future/Placeholder)**
    Intended for the bottom-center of the HUD, reminiscent of World of Warcraft action bars.
    *   This would provide quick access to frequently used agent commands, abilities, or tools.
    *   *Current Status:* Conceptual; no specific implementation in the provided codebase. UI standards for its appearance and interaction (mouse click, keyboard hotkey, hand gesture selection, ARIA roles for buttons) will be defined later.

    **8.3.3 Inspector Window (Future/Placeholder)**
    Intended for the bottom-right, reminiscent of StarCraft unit/building information panels.
    *   This would display detailed information about a selected agent, task, NIP-90 job, or other entities. Content must be structured accessibly (e.g., proper heading levels, lists).
    *   *Current Status:* Conceptual; no specific implementation. Standards for content structure and interaction will be defined later.

    **8.3.4 Bitcoin Balance Display (Future/Placeholder)**
    Intended for the top-right, reminiscent of StarCraft mineral/gas displays.
    *   This would show the user's current Bitcoin balance, presumably managed by the Spark SDK service. Text must meet contrast requirements.
    *   *Current Status:* Conceptual; no specific implementation. Standards for its appearance and update frequency will be defined later.

**8.4 Control Elements**
Fixed buttons for global HUD and feature control are positioned at the bottom of the screen. These buttons MUST have clear visual focus indicators and accessible names (e.g., `aria-label`). Their state (e.g., 'Hand Tracking On/Off') MUST be programmatically determinable via ARIA attributes (e.g., `aria-pressed`).

**8.4.1 Hand Tracking Toggle**
A button (`src/components/hands/HandTrackingToggleButton.tsx`) typically located at `bottom-4 left-16` (from `HomePage.tsx`) allows the user to enable or disable hand tracking.
_ Icon: `Hand` icon from `lucide-react`. `aria-label="Toggle Hand Tracking"` required.
_ Visual State: Button appearance changes to indicate if hand tracking is active (e.g., primary color background) or inactive. State conveyed by `aria-pressed`.

**(Page 11)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

    **8.4.2 Pane Creation Buttons**
    Buttons to open specific functional panes are part of the HUD. They MUST have accessible names.
    *   **New NIP-28 Channel Button (`src/components/hud/NewChannelButton.tsx`):** Located at `bottom-4 left-[7rem]`. Opens a new NIP-28 chat channel pane. Icon: `MessageSquarePlus`. `aria-label="Open new NIP-28 channel"` required.
    *   **NIP-90 DVM Dashboard Button (`src/components/hud/Nip90DashboardButton.tsx`):** Located at `bottom-4 left-[10rem]`. Opens the NIP-90 dashboard pane. Icon: `Cpu`. `aria-label="Open NIP-90 DVM Dashboard"` required.

    **8.4.3 Reset HUD Button (`src/components/ResetHUDButton.tsx`)**
    Located at `bottom-4 left-4`. Resets the pane layout to its default initial state as defined in `src/stores/pane.ts`. Icon: `IconRefresh` (SVG). `aria-label="Reset HUD layout"` required.

**9. PANES**

Panes are the primary containers for content and interaction within Commander. They are designed to be flexible, draggable, and resizable, managed by the `usePaneStore` (see Section 5) and rendered by `PaneManager.tsx`. The individual pane UI and behavior are handled by `Pane.tsx`.

**9.1 Basic Pane Appearance**
A pane is a rectangular region drawn with a dark, semi-transparent background (`bg-black/90 backdrop-blur-sm`) and a border (`border-border/20`). Panes have rounded corners (`rounded-lg`) and a drop shadow (`shadow-lg`). Contrast between pane background, border, title bar, and text/icons MUST meet WCAG AA requirements.

- **Title Bar:** Each pane has a title bar at the top (`h-8`), which is darker (`bg-black/80`) and displays the pane's `title` (truncated if too long). The title bar is the primary affordance for dragging the pane and MUST be keyboard focusable to allow keyboard-based manipulation. It should have appropriate ARIA roles.
- **Content Area:** Below the title bar is the content area (`h-[calc(100%-2rem)]`), which has `overflow-auto` to allow scrolling if content exceeds the pane's dimensions. It has a slight padding (`p-1`).
- **Dismiss Button:** Dismissable panes show an 'X' icon (`lucide-react IconX`) in the top-right of the title bar for closing the pane. This button MUST be keyboard focusable and have an accessible name (e.g., `aria-label="Close [Pane Title]"`).

**9.2 Pane Lifecycle (Adding, Removing)**

- **Adding Panes:** New panes are added via actions in `usePaneStore` (e.g., `addPane`, `openChatPane`, `createNip28ChannelPane`). New panes are typically made active and brought to the front. Their initial position is calculated by `calculateNewPanePosition` to tile or cascade them. When a new pane opens and receives focus, screen readers should be notified.
- **Removing Panes:** Dismissable panes can be closed by clicking their 'X' button (or via keyboard, e.g., Esc when button has focus, or a dedicated pane close hotkey). This calls `removePaneAction`. If the active pane is removed, the store attempts to activate another pane (typically the last one in the list), and focus should be managed logically.
- **Default Panes:** On startup, default panes (e.g., a main NIP-28 chat channel) are initialized as per `getInitialPanes` in `src/stores/pane.ts`.

**9.3 The Active Pane**
Only one pane can be active (focused) at a time. The active pane is visually distinguished by:

- A more prominent border that is not solely reliant on color (e.g., increased thickness or different style in addition to color change).
- An off-screen text announcement for screen readers (e.g., through an ARIA live region or by updating the window title if appropriate, stating "[Pane Title] active").
- A higher `zIndex` to ensure it renders above other panes. The `PaneManager` assigns z-index based on the pane's position in the `panes` array (where the active pane is moved to the end). `Pane.tsx` also uses the `isActive` prop to set a z-index.

**9.4 Making a Pane Active**
A pane becomes active when:

- The user clicks anywhere on the pane (including its title bar or content area, but excluding resize handles or buttons within the title bar). This is handled by `handlePaneMouseDown` in `Pane.tsx`, which calls `bringPaneToFrontAction` in the store.
- A new pane is created; it typically becomes active immediately.
- The user navigates to a pane using keyboard commands (e.g., a hotkey to cycle through panes, like Ctrl+Tab, and Enter/Space to activate the focused pane).

**(Page 12)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**9.5 Moving a Pane (Mouse, Hand, Keyboard)**
Panes can be moved by dragging their title bar.

- **Mouse Drag:** Implemented in `Pane.tsx` using `useDrag` from `@use-gesture/react`. The cursor changes to `cursor-grab` (or `active:cursor-grabbing`).
- **Hand Pinch-Drag:** Implemented in `HomePage.tsx`. If hand tracking is active, performing a `PINCH_CLOSED` gesture with the `pinchMidpoint` over a pane's title bar initiates a drag. Moving the pinched hand moves the pane. Releasing the pinch ends the drag.
- **Keyboard:** When a pane's title bar or the pane itself (as a whole, if designed as such) has focus, users MUST be able to move it using arrow keys, potentially in combination with a modifier key (e.g., Ctrl + Arrow Keys). Clear instructions for keyboard-based pane manipulation should be available in help documentation.
- **Bounds:** Panes are constrained within the viewport, with a small margin ensuring a part of the pane (usually the title bar or a handle area) remains accessible (`bounds` in `Pane.tsx` and drag logic). The `ensurePaneIsVisible` utility helps maintain visibility.
- **State Update:** The `updatePanePositionAction` in the store is called when the drag operation ends (on `last` event for mouse drag, or on significant movement for hand drag, or after keyboard move) to persist the new `x`, `y` coordinates. `lastPanePosition` in the store is updated.

**9.6 Resizing a Pane (Mouse, Keyboard)**
Panes can be resized by dragging their borders/corners.

- **Affordance:** Eight resize handles are rendered around the pane's perimeter (top, bottom, left, right, and corners). These are small, semi-transparent areas that change the mouse cursor to the appropriate resize icon (e.g., `nwse-resize`, `ew-resize`). These handles MUST be keyboard focusable or an alternative keyboard mechanism for resizing must be provided.
- **Interaction (Mouse):** Implemented in `Pane.tsx` within the `useResizeHandlers` custom hook, using `useDrag` for each handle.
- **Interaction (Keyboard):** When a pane or its resize affordance has focus, users MUST be able to resize it using arrow keys (e.g., Alt + Arrow keys, or similar intuitive combination). Clear instructions for keyboard-based resizing must be provided.
- **Constraints:** Panes have minimum dimensions (`minWidth = 200`, `minHeight = 100`).
- **State Update:** `updatePaneSizeAction` (and `updatePanePositionAction` for handles that affect position) is called when the resize operation ends to persist the new `width`, `height`. `lastPanePosition` is updated.

**9.7 Scrolling within Panes**
If the content of a pane exceeds its visible dimensions, scrollbars appear.

- **Mechanism:** The `pane-content` div in `Pane.tsx` has `overflow-auto`.
- **Appearance:** Custom scrollbars are styled in `src/styles/global.css` for a more integrated HUD aesthetic (thin, semi-transparent). This styling targets `-webkit-scrollbar`. Standard OS scrollbars will appear if custom styling is not supported or overridden.
- **Accessibility:** Scrollable areas MUST be navigable via keyboard (e.g., arrow keys, Page Up/Down, Home, End when the scrollable area or an element within it has focus). Custom scrollbars, if used, MUST be keyboard operable if they are interactive and provide appropriate visual cues and ARIA attributes if they are custom controls.

**9.8 Pane Types**
Each pane has a `type` property (defined in `src/types/pane.ts`) that determines the content it displays. The `PaneManager.tsx` uses this type to render the appropriate child component. Content within each pane type must adhere to accessibility standards relevant to its nature (e.g., forms, text display, lists).

- **Current Types:**
  - `'default'`: A generic placeholder pane.
  - `'chat'`: Used for individual chat threads (potentially for direct messages or specific agent interactions).
  - `'chats'`: (Conceptual) A pane to list available chat threads or contacts.
  - `'user'`: (Conceptual, possibly for user status or profile).
  - `'diff'`: (Conceptual, for displaying differences between text/code).
  - `'changelog'`: (Conceptual, for application updates).
  - `'nip28_channel'`: Displays a NIP-28 public chat channel interface using `Nip28ChannelChat.tsx`. Content includes `channelId` and `channelName`.
  - `'nip90_dashboard'`: Displays the NIP-90 Data Vending Machine dashboard using `Nip90Dashboard.tsx`.
- **Extensibility:** New pane types can be added by defining a new type string and adding a corresponding rendering case in `PaneManager.tsx`.

**(Sections 10-12 relate to selection, which in Commander is mostly standard OS text selection within input fields or specific content views.)**

**(Page 13)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**10. THE SELECTION (TEXT AND CONTENT)**

Within panes that display editable text (e.g., chat input) or selectable content, selection behavior follows standard operating system conventions.

- **Text Selection:** Achieved by mouse click-and-drag. Standard keyboard text selection (Shift + Arrow keys, etc.) is also supported.
- **Content Selection:** Specific panes might implement their own content selection mechanisms (e.g., selecting an item in a list within the Inspector pane). These will adhere to common interaction patterns (click to select, Shift+click for range, Ctrl/Cmd+click for multiple individual items where appropriate) and MUST be keyboard operable (e.g., arrow keys to navigate, Space to select/deselect).
- **Visual Indication:** Selection styling MUST provide sufficient contrast against both selected and unselected content and backgrounds (see Section 1.3).

**11. VISIBILITY OF OPERATIONS ON SELECTIONS**

Operations available for selected content are typically made visible through:

- **Context Menus (Future):** Right-clicking on a selection or selected item may reveal a context-sensitive menu with relevant actions (e.g., copy, paste, agent commands related to the selected item). Context menus MUST be keyboard-operable (e.g., via Shift+F10 or context menu key) and navigable using arrow keys, Enter/Space to activate, and Esc to close. (See Section 39.3 for ARIA menu patterns).
- **Dedicated UI Elements:** The Inspector pane (future) would display actions relevant to the currently selected agent or item in another pane. These elements must be keyboard accessible.
- **Hotkeys (Future):** Keyboard shortcuts will provide access to operations on the current selection.

Commander avoids "modes" where operations are chosen before the selection, preferring an object-action sequence.

**12. MARKING A SELECTION**

Visual feedback for selections is standard:

- **Text:** Selected text is typically highlighted with the system's selection color or an application-defined color that meets contrast requirements (see Section 1.3).
- **UI Elements:** Selected items in lists or other custom views will have a distinct visual state (e.g., different background color, border) that is not solely reliant on color and meets contrast requirements. ARIA attributes like `aria-selected="true"` MUST be used.

**(Section 13-17 cover menus, which in Electron are primarily OS-native, plus any in-app navigation that acts like a menu.)**

**(Page 14)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**13. THE MENU BAR AND IN-APP MENUS**

**13.1 Application Menu Bar (Electron Native)**
As an Electron application, Commander utilizes the native OS menu bar (File, Edit, View, Window, Help on macOS; integrated into the window frame on Windows/Linux).

- **Standard Menus:** These menus provide standard application-level commands (e.g., Quit, Copy, Paste, Toggle Developer Tools). Their content is largely defined by Electron defaults and can be customized in `src/main.ts` if necessary. Native menus are generally accessible by default, but custom menu items must have clear, descriptive labels and appropriate mnemonics where applicable.
- **Customization:** Currently, no significant customization of the native menu bar is detailed in the codebase beyond Electron defaults.

**13.2 In-App Navigation Menus**
Commander includes a simple navigation menu component (`src/components/template/NavigationMenu.tsx`) using Shadcn UI's `NavigationMenu` components.

- **Purpose:** Primarily used for routing between top-level application views/pages (e.g., "Home Page", "Second Page") as defined in `src/routes/routes.tsx`.
- **Appearance:** Horizontal list of links, styled according to Shadcn UI and Tailwind CSS.
- **Interaction:** Standard mouse click to navigate. These menus MUST use appropriate ARIA roles (e.g., `navigation`, `menubar`, `menuitem`) to ensure they are understandable to assistive technologies. Keyboard navigation (Tab, arrows, Enter, Esc) MUST be fully supported by the underlying Radix UI primitives.

**13.3 Contextual "Menus" within Panes (Future)**
While not traditional menus, actions available for items within specific panes (e.g., right-click context menus, action buttons in an Inspector pane) will provide menu-like functionality. These will be designed for clarity and ease of access, consistent with the overall HUD aesthetic, and MUST follow ARIA menu patterns for keyboard interaction and screen reader support.

**14. MAKING MENU CHOICES**

- **Native Menu Bar:** Interaction follows OS conventions (mouse click, keyboard navigation with Alt keys or arrow keys).
- **In-App Navigation Menu:** Mouse click on links. Keyboard navigation (Tab to focus, Enter to activate, arrow keys if structured as a menubar).

**15. MENU ITEMS THAT DO NOTHING (DISABLED ITEMS)**

- **Native Menu Bar:** Menu items that are not applicable in the current context will be disabled (grayed out) according to OS standards. Electron's menu API allows for dynamic enabling/disabling.
- **In-App Navigation Menu/Buttons:** Buttons or links for unavailable actions will be styled as disabled (e.g., reduced opacity, `disabled:opacity-50` Tailwind class) and will not respond to clicks. They MUST have `aria-disabled="true"` set, and their visual styling must clearly indicate their disabled state without relying solely on color (e.g., reduced opacity plus a grayed-out appearance).

**(Page 15)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**16. CONTENTS OF THE MENU BAR AND MENUS**

- **Native Electron Menu Bar (Default Structure - illustrative):**
  - **File:** New Window, Close Window, Quit.
  - **Edit:** Undo, Redo, Cut, Copy, Paste, Select All.
  - **View:** Reload, Force Reload, Toggle Developer Tools, Toggle Full Screen.
  - **Window:** Minimize, Zoom, Close. (Window control buttons are also part of the custom title bar region for direct mouse interaction.)
  - **Help:** About Commander, Documentation links, Accessibility Information (Future).
  - _(Actual menus can be customized in `src/main.ts` if specific app actions are needed here.)_
- **In-App Navigation Menu (`NavigationMenu.tsx`):**
  - Currently contains links to "Home Page" (`/`) and "Second Page" (`/second-page`). This menu is primarily for demonstrating routing capabilities.

**17. MAKING MENU CHOICES FROM THE KEYBOARD**

Interaction with the native Electron menu bar via keyboard follows OS conventions (e.g., Alt key to reveal mnemonics on Windows/Linux, standard macOS menu keyboard navigation). In-app navigation elements and buttons are part of the standard Tab order for keyboard accessibility and MUST support activation via Enter/Space and navigation using arrow keys if they are structured as ARIA menus/menubars.

**18. THE DIALOG BOX / MODALS**

Commander utilizes Shadcn UI, which provides components for dialogs/modals. These will be used for:

- Presenting critical information or warnings to the user.
- Requesting user input for specific tasks that require focused interaction (e.g., settings configuration, confirmation prompts).
- **Appearance:** Dialogs will adhere to the application's dark theme and styling conventions defined by Shadcn UI and Tailwind CSS. They will typically overlay the current view with a backdrop to focus user attention. Text and controls within dialogs must meet contrast requirements.
- **Interaction:** Standard interaction with dialog elements (buttons like OK/Cancel, input fields) via mouse or keyboard.
- **Accessibility Standards:** Dialogs/Modals MUST adhere to the following:
    - **Focus Management:** When a dialog opens, focus MUST be moved to an interactive element within the dialog (often the first input field or the primary action button). Focus MUST be trapped within the dialog (i.e., tabbing should cycle within the dialog and not go to elements behind it) until it is closed. Upon closing, focus MUST return to the element that triggered the dialog, or a well-defined logical predecessor.
    - **Keyboard Operation:** Dialogs MUST be dismissible via the `Esc` key. All interactive elements within the dialog MUST be keyboard accessible and follow a logical tab order.
    - **ARIA Attributes:** Dialogs MUST use `role="dialog"` (or `role="alertdialog"` if it's an alert requiring immediate user attention). `aria-modal="true"` MUST be set. The dialog MUST have an accessible name, typically provided by `aria-labelledby` referencing a visible dialog title element (e.g., `<h2 id="dialog-title">...</h2> <div role="dialog" aria-labelledby="dialog-title">...</div>`). If there's descriptive text, `aria-describedby` can be used.
- _(Specific dialog implementations are not detailed in the provided core codebase but would leverage `Dialog` components from `src/components/ui/` if added via `npx shadcn@canary add dialog`.)_

**(Page 16)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**19. TEXT EDITING PHILOSOPHY**

Text input and editing within Commander primarily occur in designated input fields, such as the chat input (`Textarea` in `ChatWindow.tsx`) or form fields (e.g., in `Nip90RequestForm.tsx`).

- **Behavior:** Text editing follows standard OS conventions.
- **Components:** Shadcn UI components like `Input` and `Textarea` are used, providing familiar text editing affordances. These components MUST be associated with visible labels using `<label for="...">` or ARIA properties (`aria-labelledby`) for accessibility.
- **NUI Interaction:** Direct text input via hand gestures (e.g., a virtual keyboard or handwriting recognition) is not a current feature but could be explored in future NUI enhancements, ensuring any such feature is also accessible.

**20. TYPING PRINTING CHARACTERS**

When a character is typed, it is inserted at the current caret position within an active text input field. If text is selected, typing a character typically replaces the selection. This is standard OS behavior.

- A beep or visual indication may occur if typing is attempted in a non-input context or when an input field is disabled (though this is usually handled by the OS or UI component library). Any custom auditory feedback must be user-configurable.

**21. KEYS THAT ALTER THE MEANING OF OTHER KEYS (MODIFIERS)**

Standard modifier keys (Shift, Control, Alt/Option, Command/Windows) function as per OS conventions for text editing (e.g., Shift + arrow for selection, Ctrl/Cmd + C for copy).

- **Application-Specific Modifiers (Hotkeys):** As detailed in Section 4.2, modifier keys will be integral to the (future) StarCraft-style hotkey system for issuing agent commands and navigating the UI efficiently. For example:
  - `Ctrl + [1-9]` could select/create control groups of agents.
  - `Shift + Click` could add/remove agents from a selection.
  - `Alt + [Key]` could trigger secondary abilities for selected agents.
  These hotkeys must be customizable to avoid conflicts with assistive technologies. (See Section 33.5)
- **Pane Interaction Modifiers:**
  - `isCommandKeyHeld` (Cmd on macOS, Ctrl on Windows/Linux) is used in `openChatPaneAction` to alter the behavior of opening a new chat pane (e.g., tiling vs. replacing).

**(Page 17)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**22. SHIFT**

The SHIFT key is used in standard ways:

- To type uppercase letters or the upper symbols on number/symbol keys.
- In combination with arrow keys or mouse clicks for extending text selections.
- As a modifier in (future) application-specific hotkeys.
- With Tab (`Shift + Tab`) to navigate focus in reverse order.

**23. ALPHA LOCK (CAPS LOCK)**

The CAPS LOCK key functions as per standard OS behavior, toggling persistent uppercase input for alphabetic characters. It generally does not affect number or symbol keys or application-specific hotkeys. Its state should not be relied upon for application logic, as users may use it for accessibility reasons.

**24. CODE (SPECIAL KEYS FOR HOTKEYS)**

This section in the COMM document referred to a specific "CODE" key. In Commander, this concept maps to the use of standard keyboard keys (letters, numbers, function keys F1-F12, Esc, etc.) as part of the (future) hotkey system, often in conjunction with modifiers (Ctrl, Alt, Shift).

- **Example Philosophy:**
  - `Q, W, E, R` row: Often used for primary abilities in games.
  - `A, S, D, F` row: Often used for common commands (Attack, Stop, Hold Position, etc.).
  - Number keys `1-0`: For selecting control groups.
  - `Esc`: To cancel current action, deselect, close dialogs/menus, or blur focus from an input.
- The specific mapping of these keys to Commander functions is TBD and will be designed with common keyboard accessibility patterns in mind, avoiding conflicts with OS or assistive technology shortcuts where possible, and allowing for user customization.

**25. REPEATING KEYS**

When a character key is held down, it will repeat according to the user's operating system settings. This applies to text input fields. Arrow keys also repeat for navigation within text or lists, or for adjusting values in custom controls (e.g., sliders). Modifier keys (Shift, Ctrl, Alt) do not repeat.

**(Page 18)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**26. TYPE AHEAD**

Type ahead (buffering of keyboard input when the application is temporarily busy) is generally handled by the underlying operating system and UI framework (Electron/React). Commander itself does not implement a custom type-ahead buffer. Users should experience standard type-ahead behavior. The application should strive to be responsive to prevent excessive buffering.

**27. BACKSPACE KEY**

The BACKSPACE key (or Delete key on some keyboards when deleting forwards) functions as per standard OS text editing conventions:

- If text is selected, pressing Backspace deletes the selected text.
- If no text is selected, Backspace deletes the character to the left of the caret.
- In contexts outside text editing (e.g., navigating a list where items can be deleted), Backspace might be assigned as a hotkey for a "delete selected item" action, but this requires careful design to avoid accidental deletions and should include a confirmation step if destructive.

**28. TAB KEY**

The TAB key is used for standard focus navigation:

- Moves focus between interactive UI elements (input fields, buttons, links, pane headers, custom controls) in a logical order as defined in Section 4.3.
- `Shift + TAB` moves focus in the reverse order.
- Within text areas (`Textarea`), TAB may insert a tab character. If so, users must be able to exit the textarea using another key combination (e.g., Ctrl+Tab, or Esc to blur and then Tab). Standard WAI-ARIA practices for text areas should be followed. Commander uses Shadcn UI components which generally follow these.

**29. RETURN (ENTER) KEY**

The RETURN (or ENTER) key has context-dependent behavior:

- **Chat Input (`ChatWindow.tsx`):** Pressing Enter sends the current message. Pressing `Shift + Enter` inserts a new line.
- **Form Fields:** May submit the form or move focus to the next field, depending on the form's design. Standard behavior is to submit if the form contains a single text input or if focus is on a submit button.
- **Dialogs/Modals:** Typically activates the default button (e.g., "OK", "Submit").
- **Selected Items:** May trigger a default action on a selected item in a list or menu (equivalent to a click).
- **Buttons and Links:** Activates the focused button or link.

**(Page 19)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**30. THE EDIT MENU (SYSTEM LEVEL)**

Commander relies on the standard Edit menu provided by Electron, which integrates with OS-level clipboard operations. These menu items must remain accessible and functional.

**30.1 Cut**
Removes the current selection from its location and places it onto the system clipboard. Standard keyboard shortcut (Ctrl/Cmd + X) and menu access apply.

**30.2 Paste**
Inserts the content of the system clipboard at the current caret position, or replaces the current selection if one exists. Standard keyboard shortcut (Ctrl/Cmd + V) and menu access apply.

**30.3 Copy**
Copies the current selection to the system clipboard without removing it from its original location. Standard keyboard shortcut (Ctrl/Cmd + C) and menu access apply.

**30.4 Undo**
Reverts the last user action, typically text editing operations. Standard keyboard shortcut (Ctrl/Cmd + Z) and menu access apply. The scope and granularity of Undo are generally managed by the individual UI components (e.g., text input fields). Application-wide Undo for pane manipulations or agent commands is not a current standard feature, but if implemented, it must be clearly communicated and accessible.

**(Page 20)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**31. UTILITY PANES**

Various panes within Commander serve utility functions, providing access to tools, information, or specific features.

- **NIP-28 Channel Pane (`Nip28ChannelChat.tsx`):** Displays and allows interaction with a Nostr public chat channel. Contains a chat window. Chat content must be accessible (see Section 8.3.1).
- **NIP-90 DVM Dashboard Pane (`Nip90Dashboard.tsx`):** Allows users to create NIP-90 job requests and view results/feedback from Data Vending Machines. Contains a request form (all form fields must be labeled and keyboard accessible) and an event list (list items must be keyboard navigable and selectable, with states announced to assistive technologies).
- **Chat Pane (Generic):** A general-purpose chat interface used for direct interaction with agents or other users (if applicable in future).
- **Chats List Pane (Conceptual):** Would list available NIP-28 channels or other chat threads. List items must be keyboard navigable and provide accessible names.
- **Changelog Pane (Conceptual):** Would display application update notes, structured with proper headings for easy navigation.
- **Inspector Pane (Future):** Would display detailed information and actions for a selected entity. Content must be structured semantically.

These utility panes adhere to the general pane behaviors outlined in Section 9 (draggable, resizable, activatable), including all keyboard accessibility requirements for these actions.

**32. THE SCRAP (SYSTEM CLIPBOARD)**

Commander uses the standard operating system clipboard for cut, copy, and paste operations. There is no application-specific "Scrap" or clipboard manager beyond this. All copyable content must be selectable via keyboard.

**33. USER PROFILE AND SETTINGS**

User-specific settings and preferences are managed by the application and must be accessible via keyboard.

**33.1 Language Settings**

- Commander supports internationalization (i18n) using `i18next`.
- Available languages are defined in `src/localization/langs.ts` (e.g., English, Portuguese (Brazil)).
- Users can switch the application language using the `LangToggle.tsx` component, which utilizes `src/helpers/language_helpers.ts`. This toggle must be keyboard accessible and announce its state.
- The selected language is persisted in `localStorage` under the key `lang`.

**33.2 Theme Settings (Forced Dark)**

- Commander currently enforces a **dark theme** application-wide.
- The native OS theme is set to dark via `nativeTheme.themeSource = "dark"` in `src/main.ts`.
- The `dark` class is applied to the HTML root element, and Tailwind CSS variables for the dark theme are used (defined in `src/styles/global.css`).
- The `ToggleTheme.tsx` component acts as an indicator of this forced dark mode rather than a toggle.
- Theme preference is technically persisted in `localStorage` under the key `theme` by `src/helpers/theme_helpers.ts`, but current logic always forces dark mode. Future development will include user-selectable themes, including a high-contrast option and potentially a light theme, to cater to different visual accessibility needs. (See Section 33.5)

**(Page 21)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**33.3 Pane Layout Persistence**
The state of panes (their IDs, types, titles, positions, sizes, and active status) is persisted in `localStorage` under the key `commander-pane-storage-v2`.

- This is managed by the `usePaneStore` using Zustand's `persist` middleware (`src/stores/pane.ts`).
- Upon application startup, the persisted layout is loaded. A `merge` function handles cases of missing or malformed persisted data, ensuring default panes (like the main NIP-28 channel) are present.
- The `ResetHUDButton.tsx` component allows users to reset the pane layout to the initial default state.

**33.4 Telemetry Settings**
Commander includes a `TelemetryService` for logging application events, warnings, errors, and feature usage.

- **User Control:** The system is designed to allow users to enable or disable telemetry (though the UI for this toggle is not explicitly detailed in the provided HUD components, the service supports `setEnabled`). This toggle MUST be easily discoverable and keyboard accessible.
- **Default Behavior:**
  - Development Mode: Logs to `console.log`.
  - Production Mode: Silent by default (would send to a backend if configured).
- **Logging:** All application-level diagnostics **MUST** use `TelemetryService.trackEvent()`. Direct use of `console.*` methods is disallowed except for temporary local debugging or specific internal service logging. (See `docs/AGENTS.md#11-logging-and-telemetry` and `docs/TELEMETRY.md`).
- **Persistence (Future):** `docs/TELEMETRY.md` suggests persistent storage for the enabled/disabled state using Electron settings API, which is a future enhancement over in-memory or `localStorage`.

    **33.5 Accessibility Settings (Future)**
    A dedicated section within User Settings will provide controls for accessibility-related preferences. All settings within this section MUST be keyboard accessible and clearly labeled, with changes providing immediate or clear feedback. These may include:
    - **Text Size:** Options to increase or decrease global UI font size, with changes reflowing content correctly.
    - **High-Contrast Mode:** A toggle to enable a theme with enhanced contrast ratios beyond the default dark theme, or a user-selectable choice of specific high-contrast themes.
    - **Reduced Motion:** An option to minimize or disable UI animations and transitions for users sensitive to motion. This should respect OS-level reduced motion settings if available.
    - **NUI Adjustments:** Controls for hand tracking sensitivity, gesture customization, or disabling NUI entirely.
    - **Keyboard Shortcut Customization:** Interface to view and remap hotkeys to avoid conflicts and suit user needs.
    - **Auditory Feedback Preferences:** Controls for enabling/disabling or adjusting volume of UI sounds.
    - **Focus Indicator Customization:** (Advanced) Options to change the appearance (color, thickness) of the keyboard focus indicator.

**(New sections for Commander's unique aspects begin here.)**

**(Page 22)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**34. VOICE COMMANDS**

Voice commands are envisioned as a key NUI modality for Commander, allowing users to interact with the application and command agents hands-free.

**34.1 Philosophy and Invocation (Future)**

- **Natural Language:** Voice commands should aim to support natural language phrases rather than rigid, predefined commands where feasible.
- **Activation:** A clear invocation method will be required (e.g., a wake word like "Commander..." or a dedicated push-to-talk hotkey/UI button). This is crucial to avoid accidental command execution and must be accessible.
- **Alternative to Physical Input:** Voice commands can serve as a valuable accessibility feature for users with motor impairments or those who cannot use hand tracking or keyboard/mouse effectively.
- **Feedback:**
  - **Visual:** The UI should provide clear visual feedback when it is listening for voice input (e.g., a microphone icon changing state, with sufficient contrast).
  - **Auditory:** Confirmation sounds or voice responses may be used to indicate command understanding or execution status. These must be configurable.
  - **Textual:** A transcript or textual confirmation of recognized commands should be available for users who are deaf or hard of hearing, or who prefer visual confirmation.
- **Context-Sensitivity:** Available voice commands may change based on the active pane, selected agent, or current application state. This context should be clearly communicated.
- **Error Recovery & Clarity:** Clear mechanisms for correcting misrecognized commands (e.g., "cancel that," "try again") and unambiguous feedback are essential. Users should be able to easily exit voice input mode.

**34.2 Available Commands (Future - Illustrative Examples)**
The specific set of voice commands is TBD. Potential commands could include:

- "Commander, open chat with Agent X."
- "Commander, show NIP-90 dashboard."
- "Commander, Agent Y, perform action Z with parameter P."
- "Commander, what is my Bitcoin balance?"
- "Commander, drag current pane to the right." (If hand-free pane manipulation is desired)
- "Commander, enable/disable hand tracking."
- "Commander, read active pane content." (Example accessibility command)

_(Detailed specification of voice commands, grammar, and feedback mechanisms will be defined in a future revision of this document, with accessibility as a core consideration.)_

**35. NOSTR INTEGRATION**

Commander integrates several Nostr Implementation Possibilities (NIPs) to facilitate decentralized communication, identity, and service interaction. Services for these are defined in `src/services/`. UI elements related to Nostr features must be accessible.

**35.1 NIP-04 Encrypted Direct Messages**

- Used for secure, private communication, potentially between the user and agents, or user-to-user if such features are added.
- `NIP04Service` (`src/services/nip04/`) handles encryption and decryption of message content.
- The `createNip90JobRequest` helper uses NIP-04 to encrypt job inputs and parameters sent to Data Vending Machines.
- Channel messages in NIP-28 are also encrypted using NIP-04 to the channel creator's public key.
- UI for sending/receiving DMs must be accessible, with clear indication of encryption status.

**(Page 23)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**35.2 NIP-19 Identifiers**

- Bech32-encoded entities (`npub`, `nsec`, `note`, `nprofile`, `nevent`, `naddr`) are used for user-friendly display and input of keys and event identifiers.
- `NIP19Service` (`src/services/nip19/`) handles encoding and decoding of these identifiers.
- Displayed in UI elements like `Nip90EventList.tsx` for event IDs and pubkeys. These identifiers must be selectable and copyable via keyboard. Long identifiers should be presented in a way that doesn't break layout, possibly with truncation and a tooltip/button to reveal the full ID.

**35.3 NIP-28 Public Chat Channels**

- Commander supports interaction with NIP-28 public chat channels.
- `NIP28Service` (`src/services/nip28/`) manages channel creation (Kind 40), metadata updates (Kind 41), sending/receiving encrypted messages (Kind 42), and (future) moderation events (Kind 43, 44).
- The primary chat interface in the default HUD layout is a NIP-28 channel pane (`src/components/nip28/Nip28ChannelChat.tsx`). Chat accessibility standards apply (see Section 8.3.1).
- Users can create new NIP-28 channels via the `NewChannelButton.tsx` in the HUD.

**35.4 NIP-90 Data Vending Machines (DVMs)**

- Commander allows users to request on-demand computation from DVMs.
- `NIP90Service` (`src/services/nip90/`) handles the creation of job requests (Kind 5xxx), fetching job results (Kind 6xxx), and job feedback (Kind 7000).
- Inputs and parameters for DVM jobs can be NIP-04 encrypted for privacy, targeting a specific DVM's public key.
- The `Nip90Dashboard.tsx` pane provides the UI for interacting with DVMs, including a form to create requests (`Nip90RequestForm.tsx`) and a list to view events (`Nip90EventList.tsx`). All form elements MUST be labeled and keyboard accessible. The event list must be navigable via keyboard, and job statuses clearly indicated and announced to assistive technologies.

**(Page 24)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**36. BITCOIN INTEGRATION (SPARK SDK)**

Commander aims to integrate Bitcoin transactions, allowing users to "earn bitcoin" by providing compute via agents (as per `docs/transcripts/ep174.md`) and potentially make payments. This is facilitated by the Spark SDK.

- **Service:** `SparkService` (`src/services/spark/`) abstracts interactions with the Spark SDK.
- **Wallet Initialization:** The service initializes a `SparkWallet` using a mnemonic/seed (a development mnemonic is provided by default).
- **Functionality (exposed via `SparkService` interface):**
  - `createLightningInvoice`: To request Bitcoin payments via Lightning.
  - `payLightningInvoice`: To make Bitcoin payments via Lightning.
  - `getBalance`: To check the user's Bitcoin balance.
  - `getSingleUseDepositAddress`: To generate addresses for receiving on-chain Bitcoin.
- **UI (Future/Conceptual):**
  - The "Bitcoin Balance Display" (Section 8.3.4) would show the output of `getBalance`. This display must be clearly legible and its content available to screen readers.
  - Panes or dialogs would be needed for creating/paying invoices and managing wallet functions. These interfaces MUST be fully accessible, with clear labeling of amounts, addresses, fees, and action buttons. Confirmation steps for transactions are critical.
- **Error Handling:** Specific error types (e.g., `SparkConnectionError`, `SparkLightningError`) are defined for robust error management. Error messages MUST be presented in an accessible way (e.g., not just color-coded, but with clear text and ARIA alerts if appropriate).
- **Telemetry:** Spark service operations are tracked via the `TelemetryService`.

**37. AGENT INTERACTION MODEL**

The core purpose of Commander is to "Command agents, earn bitcoin." The UI must facilitate this effectively and accessibly.

- **Agent Representation (Conceptual):** Agents might be represented as entities within the HUD, possibly in a dedicated list pane or as icons. Selected agents could have their details and available commands shown in the Inspector pane. Agent representations must have accessible names and their states (e.g., busy, idle, error) must be perceivable through non-visual means as well.
- **Command Issuance:**
  - **Chat:** Users can command agents via natural language or structured commands in chat panes. The `ChatContainer` and `useChat` hook (interfacing with Ollama) form the basis for this. Chat accessibility is paramount.
  - **Direct Manipulation (Future NUI):** Hand gestures or direct interaction with agent representations in a 3D scene (if applicable) could issue commands. Keyboard/mouse alternatives are mandatory.
  - **Hotkeys (Future):** As per Section 4.2, efficient keyboard commands for agent control.
  - **Voice Commands (Future):** As per Section 34.
- **Feedback:** Agent status, task progress, and results of commands must be clearly communicated to the user. This includes:
    - Visually distinct updates with sufficient contrast.
    - Text-based messages in chat or status panes.
    - (Future) ARIA live regions or other non-intrusive announcements for screen readers for critical status changes or agent outputs. (See Section 39.3)
- **Earning Bitcoin:** The mechanism by which users earn Bitcoin through their agents (e.g., by selling spare compute via Ollama as a DVM service as hinted in `ep174.md`) needs to be clearly integrated into the agent interaction model and HUD, with earnings and related information presented accessibly.

_(Detailed specifications for agent representation and command ontologies are TBD and will be developed with accessibility in mind.)_

**(Page 25)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**38. TELEMETRY STANDARDS**

Commander incorporates a telemetry system (`src/services/telemetry/`) to gather anonymized usage data, aiding in the identification of issues and improvement of the user experience. Adherence to these standards is mandatory for all new feature development.

**Key Principles (from `docs/AGENTS.md` and `docs/TELEMETRY.md`):**

- **Centralized Service:** All application logging, event tracking, and diagnostics **MUST** use the `TelemetryService`.
- **User Control:** The `TelemetryService` supports `setEnabled` and `isEnabled` methods. UI controls MUST be provided to allow users to opt-in/out of telemetry. This control must be easily discoverable, clearly labeled, and keyboard accessible. (See Section 33.4).
- **Default Behavior:**
  - **Development Mode:** Logs events to `console.log` by default for visibility.
  - **Production Mode:** Silent by default (would transmit to a backend if configured). Telemetry should be opt-in by default, respecting user privacy.
- **No Direct `console.*` Usage:** Direct calls to `console.log()`, `console.warn()`, `console.error()`, etc., are **PROHIBITED** for application-level logging. They may only be used for temporary, local debugging and **MUST** be removed before committing code.
  - Exceptions: Internal logging within `TelemetryServiceImpl.ts` itself, specific fallback error handlers for telemetry failures, and test setup files.
- **Event Structure (`TelemetryEventSchema`):** Events tracked via `TelemetryService.trackEvent()` must conform to the schema:
  - `category`: (String) e.g., "ui", "navigation", "feature", "performance", "error", "log:info", "log:warn", "log:error", "log:debug".
  - `action`: (String) Specific action name, e.g., "button_click", "user_login_failure".
  - `label`: (Optional String) Contextual information.
  - `value`: (Optional String, Number, Boolean) Additional structured data (must be stringified if complex).
  - `timestamp`: (Optional Number) Defaults to `Date.now()`.
- **Error Handling:** The telemetry service uses Effect.js for typed error handling (e.g., `TrackEventError`). Calls to `trackEvent` should generally be fire-and-forget (e.g., using `Effect.ignoreLogged` or `Effect.runFork`) to not disrupt application flow.
- **Privacy:** Only anonymized data should be collected. No Personally Identifiable Information (PII) should be logged without explicit, informed consent and clear indication. The nature of data collected should be transparent to the user.
- **Transparency:** The telemetry system and data collection practices should be clearly documented for users (e.g., in a privacy policy or an "About Telemetry" section in settings).

**(Page 26)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**39. ACCESSIBILITY AND INCLUSIVITY STANDARDS**

Commander is committed to creating an inclusive experience that is accessible to the widest possible audience, regardless of ability or technology. These standards are intended to guide development towards this goal.

**39.1 Core Principles (WCAG)**
Commander aims to adhere to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as a minimum baseline. Development and design should be guided by the four POUR principles:

- **Perceivable:** Information and user interface components must be presentable to users in ways they can perceive. This means users must be able to perceive the information being presented (it can't be invisible to all of their senses).
    - Provide text alternatives for non-text content (e.g., icons, images).
    - Provide captions and other alternatives for multimedia if used.
    - Create content that can be presented in different ways, including by assistive technologies, without losing meaning.
    - Make it easier for users to see and hear content (e.g., contrast, text size, clear audio).
- **Operable:** User interface components and navigation must be operable. This means users must be able to operate the interface (the interface cannot require interaction that a user cannot perform).
    - Make all functionality available from a keyboard.
    - Give users enough time to read and use content.
    - Do not use content that causes seizures or physical reactions (avoid flashing content or provide warnings/controls).
    - Help users navigate and find content with clear structure and navigation mechanisms.
    - Make it easier to use inputs other than keyboard (NUI, voice, mouse).
- **Understandable:** Information and the operation of user interface must be understandable. This means users must be able to understand the information as well as the operation of the user interface (the content or operation cannot be beyond their understanding).
    - Make text readable and understandable using clear language.
    - Make content appear and operate in predictable ways.
    - Help users avoid and correct mistakes with clear error messages and undo functionality where appropriate.
- **Robust:** Content must be robust enough that it can be interpreted reliably by a wide variety of user agents, including assistive technologies. This means that as technologies and user agents evolve, the content should remain accessible.
    - Maximize compatibility with current and future user agents, including assistive technologies, by adhering to web standards and ARIA practices.

**39.2 Keyboard Accessibility**
(Reference Section 4.3 for detailed keyboard navigation and interaction standards).
Key tenets include:
- All interactive elements MUST be focusable and operable via keyboard.
- A logical tab order and visible focus indicator (meeting contrast requirements) MUST be maintained.
- No keyboard traps.
- Standard activation keys (Enter, Space) MUST function as expected for relevant controls.

**39.3 Screen Reader Support (ARIA)**
To ensure compatibility with screen readers and other assistive technologies:
- Use semantic HTML elements wherever possible to provide inherent accessibility.
- For custom components and dynamic content, utilize Accessible Rich Internet Applications (ARIA) roles, states, and properties appropriately.
    - **Roles:** Define the purpose of a component (e.g., `role="button"`, `role="dialog"`, `role="tablist"`, `role="tab"`, `role="tabpanel"`).
    - **States & Properties:** Communicate the current condition or characteristics of an element (e.g., `aria-pressed="true"`, `aria-expanded="false"`, `aria-label="Close"`, `aria-disabled="true"`, `aria-selected="true"`).
- All images, icons, and non-text content that convey meaning MUST have appropriate text alternatives (e.g., `alt` text for images, `aria-label` for iconic buttons). Decorative elements should be hidden from assistive technologies (e.g., `aria-hidden="true"` or empty `alt=""`).
- Dynamic content updates (e.g., chat messages, status updates, notifications) SHOULD use ARIA live regions (`aria-live="polite"` or `aria-live="assertive"` as appropriate, `aria-atomic`, `aria-relevant`) to inform users of changes without unnecessarily shifting focus.
- Ensure accessible names and descriptions for all interactive controls, especially those without visible text labels.
- Follow ARIA design patterns for common widgets like menus, dialogs, tabs, etc.

**(Page 27)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**39.4 Visual Accessibility (Color, Contrast, Text)**
(Reference Sections 1.3 and 1.4 for theme, appearance, and typography standards).
Key tenets include:
- **Contrast:** Adherence to WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text/UI components and graphical objects). This applies to text on background, borders of components, focus indicators, and meaningful graphical elements.
- **Color:** Color MUST NOT be the sole means of conveying information, indicating status, or prompting action. Alternative visual cues (patterns, icons, text, shape) must be provided.
- **Text:** Use legible fonts, adequate default sizing, and support for text scaling up to 200% via browser zoom or application settings without loss of content or functionality.
- **Layout:** Ensure layouts are responsive and content reflows without requiring two-dimensional scrolling when zoomed or text size is increased. Maintain readability and operability at different zoom levels.

**39.5 Interaction Modality Alternatives**
Commander's NUI-first approach must be balanced with robust alternatives to ensure no user is excluded:
- All functionality available via NUI (hand tracking, future voice commands) MUST also be fully available and operable via keyboard AND mouse/trackpad.
- Users MUST be able to disable or ignore NUI features without loss of core functionality.
- (Future) Voice commands will offer another alternative interaction method, supplementing, not replacing, other accessible methods.

**39.6 User-Configurable Options**
(Reference Section 33.5 for future accessibility settings).
Commander will strive to provide users with options to customize their experience for better accessibility. These settings should be easy to find and use. This includes:
- Text size adjustments.
- High-contrast mode(s).
- Reduced motion options.
- NUI sensitivity and customization, including the option to disable.
- Keyboard shortcut customization and viewing.
- Control over auditory feedback.

**39.7 Testing and Validation**
Accessibility is an ongoing process and requires regular testing and validation:
- Regular accessibility testing MUST be part of the development lifecycle, from design to release.
- Testing should include a combination of:
    - Automated accessibility testing tools (e.g., Axe, Lighthouse).
    - Manual keyboard-only testing (navigating and operating all features).
    - Testing with various screen readers (e.g., NVDA on Windows, VoiceOver on macOS, JAWS if possible).
    - Browser zoom functionality testing up to 200-400%.
    - Color contrast checking tools for all UI elements and states.
    - Checking for reflow issues with increased text size/zoom.
- Code reviews should include checks for accessibility best practices (semantic HTML, ARIA usage).
- (Future) Involving users with a diverse range of disabilities in testing and feedback sessions is highly encouraged to gain real-world insights and ensure usability.

---

**(Page 28)**

`Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)`

**Screenshots**

_(This section would typically contain visual mockups or screenshots illustrating the UI standards. As this is a text-based generation, conceptual descriptions are provided.)_

**Figure 1: Main HUD Layout**
_Description:_ A full-screen view showing the `SimpleGrid` background. Several panes are open and arranged:
_ A NIP-28 Channel Chat pane (`nip28_channel`) is prominent, perhaps slightly larger and centered, showing active conversation. This is the `DEFAULT_NIP28_PANE_ID`.
_ A NIP-90 DVM Dashboard pane (`nip90_dashboard`) is open to one side, displaying a list of job requests.
_ (Conceptual) An Inspector Pane is docked to the bottom-right, showing details of a (hypothetically) selected agent or item.
_ (Conceptual) A Hotbar is visible at the bottom-center with several iconic buttons.
_ (Conceptual) A Bitcoin balance display is in the top-right corner.
_ The Hand Tracking Toggle, New Channel Button, NIP-90 Dashboard Button, and Reset HUD Button are visible in their fixed positions at the bottom of the screen.
_ All panes and HUD elements adhere to the dark theme. The active pane (e.g., the NIP-28 chat) has a highlighted border that is distinguishable by more than just color (e.g., thickness).
_ _All text elements shown would meet contrast requirements. Focus order through interactive elements (buttons, pane headers) would be logical and visually indicated._

**Figure 2: Pane Interaction - Dragging**
_Description:_ Shows a mouse cursor dragging the title bar of a pane. A faint outline or visual cue indicates the pane is being moved. Alternatively, shows a hand in a `PINCH_CLOSED` gesture over a pane's title bar, with the pane slightly offset, indicating it's being dragged by hand. _If keyboard dragging is active, the pane title bar would show a clear focus indicator, and visual feedback (e.g., position numbers) would update._

**Figure 3: Pane Interaction - Resizing**
_Description:_ Shows a mouse cursor over one of the eight resize handles on a pane's border. The cursor is changed to the appropriate resize arrow (e.g., `ew-resize`). The pane's border might show a visual cue that it's being resized. _Resize handles or the pane itself would be focusable for keyboard resizing, with clear instructions or cues._

**Figure 4: Chat Window (`ChatWindow.tsx`)**
_Description:_ Close-up of a chat pane.
_ Shows a list of messages (`ChatMessage.tsx`) with alternating alignment for "user" and "assistant" roles. System messages are centered and italicized. Timestamps and author names are visible.
_ An assistant message shows a "streaming" indicator (`▋` and `Loader2` icon), which should be conveyed to screen readers if it indicates a loading state.
_ A multi-line `Textarea` is at the bottom for user input, with a "Send" button. _Input area would have an associated label for screen readers (e.g., `aria-label="Type your message"`). Messages would be structured semantically (e.g., in a list or using appropriate ARIA roles) for screen reader navigation._
_ Custom scrollbars are visible if messages overflow and are keyboard operable.

**Figure 5: Hand Tracking Visualization (Debug/Development View)**
_Description:_ An overlay showing the live camera feed (mirrored) with MediaPipe hand landmarks and connections drawn on detected hands.
_ One hand is performing a `PINCH_CLOSED` gesture, and a circle with coordinates is drawn at the pinch midpoint.
_ The other hand is in an `OPEN_HAND` pose.
_ Text overlays indicate "Status: 2 hand(s) detected" and the recognized pose for each hand. Text must be high contrast.
_ This view is primarily for development and debugging hand tracking accuracy and pose recognition. _Normal operation would not rely on this visual feedback for NUI interactions; alternative feedback mechanisms are key._

**Figure 6: NIP-90 DVM Dashboard Pane**
_Description:_ The NIP-90 Dashboard pane is active.
_ The top section shows the `Nip90RequestForm.tsx` with fields for Job Kind, Input Data, Output MIME Type, and Bid Amount, along with a "Publish Encrypted Job Request" button. _Form fields would be properly labeled (e.g., using `<label for="...">` or `aria-labelledby`), have visible focus states, and validation errors would be announced accessibly._
_ The bottom section shows `Nip90EventList.tsx`, a scrollable list of NIP-90 job request event cards. Each card displays the event ID (note1...), kind, creator (npub1...), creation date, and a button to "Load Results". One card is expanded, showing job results and feedback. _The event list would be keyboard navigable (e.g., up/down arrows), and each item selectable/activatable with Enter/Space. Screen reader announcements would convey job statuses or updates dynamically (e.g., via ARIA live regions)._

**(Further figures would detail other specific UI states, dialogs, or interactions as the application evolves, each with accessibility considerations noted.)**

---

```
“DTCCOMMDOC-420-1-23.PICT” 247 KB 2001-05-04 dpi: 300h x 300v pix: 1899h x 3215v
Commander UI Info : Document # 001 : User Interface Standards (21 May 2025)
Source: OpenAgents Inc. Page 0030 of 0030
```

---

This document provides a foundational UI standard for Commander, with a strong emphasis on accessibility and inclusivity. It will be a living document, updated iteratively as new features are developed and existing ones are refined based on user feedback, NUI best practices, and evolving accessibility guidelines.
