Okay, let's break down the differences and then formulate the instructions for the coding agent.

## Differences Noted:

The "new" document is an enhanced version of the "original" with a primary focus on incorporating **accessibility and inclusivity guidelines**.

**I. Meta Document Changes:**

1.  **COMMENTS Section (Front Matter):**
    *   Original: `OpenAgents Team`
    *   New: `OpenAgents Team - Accessibility Update`
2.  **Page Count (Front Matter):**
    *   Original: `XX pages`
    *   New: `30 pages`
3.  **Contact Info (Front Matter):**
    *   Original: `(contact@openagents.com)`
    *   New: `(contact@openagents.com) - Committed to Accessibility`
4.  **Page Footers:**
    *   Original: `Page 00XX of 00XX` (e.g., `Page 0001 of 00XX`)
    *   New: `Page 00XX of 0030` (e.g., `Page 0001 of 0030`)

**II. Page 3: Quick Overview:**
*Most points are expanded to explicitly mention accessibility, perceivability, alternative inputs, or WCAG.*
1.  **Point 1 (NUI First):** Adds `, Inclusive by Design:` and `, while ensuring robust alternative input methods (keyboard, mouse) for full accessibility.`
2.  **Point 2 (Dynamic Pane-Based Workspace):** Adds `, manageable via keyboard and other assistive technologies.`
3.  **Point 3 (Integrated Agent Command & Control):** Adds `, with clear and accessible feedback mechanisms.`
4.  **Point 4 (Direct Bitcoin Integration):** Adds `, with accessible transaction information.`
5.  **Point 5 (Immersive HUD-Style Interface):** Adds `, designed with clear information hierarchy, sufficient contrast, and perceivable feedback for agent control and monitoring.`
6.  **Point 6 (Advanced Keyboard Control):** Reworded to emphasize accessibility: `Commander implements comprehensive keyboard support, including standard navigation and a sophisticated system of hotkeys (StarCraft-inspired), ensuring all functionality is operable via keyboard for efficiency and accessibility.`
7.  **Point 7 (Consistent Dark Theme):** Significantly expanded: `The application enforces a dark theme with carefully chosen color palettes ensuring sufficient contrast ratios (aiming for WCAG AA). Future iterations will explore user-configurable high-contrast modes and other visual accessibility options.` (Original just mentioned aesthetic)
8.  **Point 10 (NEW):** `Commitment to Accessibility Standards: Commander is designed and developed with a commitment to accessibility, aiming to meet or exceed Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, ensuring usability for people with diverse abilities. (See Section 39)`

**III. Page 4: Table of Contents (ToC):**
*The ToC is significantly expanded with new subsections related to accessibility and keyboard interaction. Page numbers are updated throughout, and total pages change.*
1.  **Section 3:** Adds `3.5 Accessibility Considerations for NUI ............... 4`
2.  **Section 4:** Adds `4.3 Keyboard Navigation and Interaction Standards ...... 5`
3.  **Section 9.5:** Title changes from `Moving a Pane (Mouse & Hand)` to `Moving a Pane (Mouse, Hand, Keyboard)`
4.  **Section 9.6:** Title changes from `Resizing a Pane (Mouse)` to `Resizing a Pane (Mouse, Keyboard)`
5.  **Section 33:** Adds `33.5 Accessibility Settings (Future) ................. 21`
6.  **NEW Section 39:** `Accessibility and Inclusivity Standards ............ 26` and all its sub-points (39.1-39.7) are new.
7.  **Page numbers** for subsequent sections are shifted.
8.  **Screenshots page number:** Changes from `26` to `28`.
9.  **Last pages count:** Changes from `23` to `30`.

**IV. Section 0. INTRODUCTION:**
*Accessibility and inclusivity are woven into the existing philosophy.*
1.  Paragraph 1: Adds `underpinned by a commitment to inclusivity and accessibility.`, `for everyone`, and `and accessible`.
2.  Paragraph 2: Adds `and broad accessibility.`
3.  Paragraph 3: Adds `must be extensible and robust, considering diverse user needs and assistive technologies,`

**V. Section 1. DISPLAY:**
1.  **1.2 Heads-Up Display (HUD):** Adds `, while ensuring all information is perceivable and operable through various means.`
2.  **1.3 Theme and Appearance:**
    *   Adds a sentence about WCAG AA contrast ratios.
    *   Adds new bullet points: `Contrast:`, `Color Use:`
    *   Expands the last paragraph to mention future high-contrast modes.
3.  **1.4 Typography:**
    *   Adds a sentence about font choice rationale.
    *   Adds new bullet points: `Font Size:`, `Text Scaling:`, `Line Spacing (Leading) and Spacing:`, `Text on Images/Complex Backgrounds:`

**VI. Section 2. MOUSE AND CURSOR:**
1.  Adds a new sub-heading `Accessibility Considerations:` with two bullet points.

**VII. Section 3. HAND TRACKING (NUI):**
1.  Adds new subsection `3.5 Accessibility Considerations for NUI` with detailed bullet points.

**VIII. Section 4. KEYBOARD:**
1.  Introductory paragraph: Adds `, crucial for both power users and accessibility.`
2.  **4.1 Standard Text Input:** Adds requirements for fields to be keyboard accessible and labeled.
3.  **4.2 Hotkeys & Keybindings:**
    *   `Memorability & Learnability` bullet: Adds mention of an accessible in-app guide.
    *   `Customization` bullet: Rephrased to emphasize accessibility needs and conflict avoidance.
4.  Adds new subsection `4.3 Keyboard Navigation and Interaction Standards` with detailed bullet points (Focus Management, Visible Focus Indicator, etc.).

**IX. Section 5. SYSTEM STATE AND PERSISTENCE:**
1.  Under `User Preferences:`, adds new bullet `- Accessibility Preferences (Future): ... (See Section 33.5)`

**X. Section 6. INITIALIZATION:**
1.  Point 4 (Pane System): Adds `Any persisted accessibility settings (future) would also be applied here.`

**XI. Section 7. EVERYDAY OPERATION:**
*Accessibility considerations are added to descriptions of interactions.*
1.  `Information Display:`: Adds `ensuring text is legible and information is structured for clarity.`
2.  `Interaction: > Keyboard:`: Adds `comprehensive UI navigation, pane manipulation,`
3.  `Agent Commands:`: Adds `using accessible feedback methods.`
4.  `Pane Management:`: Adds `All management functions must be keyboard accessible.`
5.  `Settings:`: Adds reference `(See Section 33)`.
6.  Final paragraph: Adds `irrespective of their preferred input modality or abilities.`

**XII. Section 8. WHAT THE SCREEN LOOKS LIKE (HUD LAYOUT):**
*Many subsections are updated with accessibility requirements (contrast, ARIA labels, keyboard focus).*
1.  **8.1 Background Grid:** Adds note on contrast and non-interference.
2.  **8.2 Pane Manager Area:** Adds note on logical and keyboard-controllable focus order.
3.  **8.3 Core HUD Elements (Intro):** Adds notes on contrast and accessible names for icons/controls.
4.  **8.3.1 Chat Window:** Adds notes on input labeling and semantic message structure.
5.  **8.3.2 Hotbar:** Adds note on ARIA roles.
6.  **8.3.3 Inspector Window:** Adds note on accessible content structure.
7.  **8.3.4 Bitcoin Balance Display:** Adds note on text contrast.
8.  **8.4 Control Elements (Intro):** Adds notes on focus indicators, accessible names, and ARIA state.
9.  **8.4.1 Hand Tracking Toggle:** Adds `aria-label` and `aria-pressed` requirements.
10. **8.4.2 Pane Creation Buttons:** Adds accessible name requirement and specific `aria-label`s.
11. **8.4.3 Reset HUD Button:** Adds `aria-label` requirement.

**XIII. Section 9. PANES:**
*Pane interactions and appearance are updated for accessibility.*
1.  **9.1 Basic Pane Appearance:**
    *   Intro: Adds WCAG contrast requirement.
    *   `Title Bar:`: Adds keyboard focusability and ARIA role requirements.
    *   `Dismiss Button:`: Adds keyboard focusability and accessible name requirement.
2.  **9.2 Pane Lifecycle:** Adds note on screen reader notification and keyboard closure.
3.  **9.3 The Active Pane:**
    *   Visual distinction: Rephrased to be less color-reliant and adds screen reader announcement.
4.  **9.4 Making a Pane Active:** Adds keyboard navigation method.
5.  **9.5 Moving a Pane:** Title changes to include "Keyboard". Adds new bullet for "Keyboard" movement.
6.  **9.6 Resizing a Pane:** Title changes to include "Keyboard". Adds keyboard focusability for handles and a "Keyboard" interaction bullet.
7.  **9.7 Scrolling within Panes:** Adds keyboard navigability and operability for custom scrollbars.
8.  **9.8 Pane Types:** Adds note that content within panes must meet accessibility standards.

**XIV. Sections 10-12 (Selection):**
*Selection mechanisms and feedback are enhanced for accessibility.*
1.  **10. THE SELECTION:** Adds keyboard operability for content selection and contrast for visual indication.
2.  **11. VISIBILITY OF OPERATIONS ON SELECTIONS:** Adds keyboard operability for context menus and dedicated UI elements.
3.  **12. MARKING A SELECTION:** Adds contrast requirements and use of `aria-selected`.

**XV. Sections 13-17 (Menus):**
*Menu interactions and attributes are updated for accessibility.*
1.  **13.1 Application Menu Bar:** Adds note on custom menu item labels/mnemonics.
2.  **13.2 In-App Navigation Menus:** Adds ARIA roles and full keyboard navigation support.
3.  **13.3 Contextual "Menus" within Panes:** Adds ARIA menu pattern requirement.
4.  **15. MENU ITEMS THAT DO NOTHING:** Adds `aria-disabled` and non-color-reliant styling for disabled items.
5.  **16. CONTENTS OF THE MENU BAR AND MENUS:** Adds "Accessibility Information (Future)" to Help menu.
6.  **17. MAKING MENU CHOICES FROM THE KEYBOARD:** Adds activation/navigation details for ARIA menus.

**XVI. Section 18. THE DIALOG BOX / MODALS:**
1.  Adds contrast requirement for text/controls.
2.  Adds new sub-heading `Accessibility Standards:` with detailed bullets for Focus Management, Keyboard Operation, and ARIA Attributes.

**XVII. Sections 19-29 (Text Editing & Keyboard Keys):**
*Minor accessibility clarifications and enhancements.*
1.  **19. TEXT EDITING PHILOSOPHY:** Adds labeling requirements for components and accessibility for NUI text input.
2.  **20. TYPING PRINTING CHARACTERS:** Adds note on user-configurable auditory feedback.
3.  **21. KEYS THAT ALTER THE MEANING OF OTHER KEYS (MODIFIERS):** Adds customizability requirement for hotkeys to avoid AT conflicts.
4.  **23. ALPHA LOCK (CAPS LOCK):** Adds note on not relying on its state for app logic due to user accessibility use.
5.  **24. CODE (SPECIAL KEYS FOR HOTKEYS):** Adds considerations for keyboard accessibility patterns and customization.
6.  **25. REPEATING KEYS:** Adds note on adjusting values in custom controls.
7.  **27. BACKSPACE KEY:** Adds note on careful design for destructive actions.
8.  **28. TAB KEY:** Clarifies behavior within text areas per WAI-ARIA.

**XVIII. Section 30. THE EDIT MENU (SYSTEM LEVEL):**
1.  **30.4 Undo:** Adds note on accessible communication if app-wide Undo is implemented.

**XIX. Section 31. UTILITY PANES:**
1.  Adds accessibility notes (labeling, navigation, announcements) for NIP-28, NIP-90, and other conceptual panes.
2.  Adds a concluding sentence about keyboard accessibility for pane actions.

**XX. Section 32. THE SCRAP (SYSTEM CLIPBOARD):**
1.  Adds `All copyable content must be selectable via keyboard.`

**XXI. Section 33. USER PROFILE AND SETTINGS:**
1.  Intro: Adds `and must be accessible via keyboard.`
2.  **33.1 Language Settings:** Adds keyboard accessibility and state announcement for the toggle.
3.  **33.2 Theme Settings (Forced Dark):** Adds note about future user-selectable themes for accessibility.
4.  **33.4 Telemetry Settings:**
    *   `User Control:`: Adds that the toggle MUST be discoverable and keyboard accessible.
5.  Adds new subsection `33.5 Accessibility Settings (Future)` with detailed bullet points.

**XXII. Section 34. VOICE COMMANDS:**
*Future voice command considerations are expanded for accessibility.*
1.  **34.1 Philosophy and Invocation:**
    *   `Activation:`: Adds `and must be accessible.`
    *   Adds new bullet: `Alternative to Physical Input:`
    *   `Feedback:`: Adds contrast for visual, configurability for auditory, and a new "Textual" feedback bullet.
    *   Adds new bullet: `Error Recovery & Clarity:`
2.  **34.2 Available Commands:** Adds an example accessibility command.
3.  End note: Adds `with accessibility as a core consideration.`

**XXIII. Section 35. NOSTR INTEGRATION:**
*UI elements for Nostr features are updated for accessibility.*
1.  Intro: Adds `UI elements related to Nostr features must be accessible.`
2.  **35.1 NIP-04:** Adds note on accessible DM UI and encryption status indication.
3.  **35.2 NIP-19:** Adds keyboard select/copy and layout considerations for long identifiers.
4.  **35.3 NIP-28:** Adds reference to chat accessibility standards.
5.  **35.4 NIP-90:** Adds labeling, keyboard accessibility for forms, and navigable/announced event lists.

**XXIV. Section 36. BITCOIN INTEGRATION (SPARK SDK):**
1.  `UI (Future/Conceptual):`: Adds accessibility notes for balance display and transaction UIs.
2.  `Error Handling:`: Adds note on accessible error presentation.

**XXV. Section 37. AGENT INTERACTION MODEL:**
*Agent interaction and feedback are enhanced for accessibility.*
1.  Intro: Adds `and accessibly.`
2.  `Agent Representation:`: Adds accessible names and non-visual state perception.
3.  `Command Issuance > Chat:`: Adds `Chat accessibility is paramount.`
4.  `Command Issuance > Direct Manipulation:`: Adds `Keyboard/mouse alternatives are mandatory.`
5.  `Feedback:`: Adds visual contrast and ARIA live region notes.
6.  `Earning Bitcoin:`: Adds note on accessible presentation of earnings.
7.  End note: Adds `and will be developed with accessibility in mind.`

**XXVI. Section 38. TELEMETRY STANDARDS:**
1.  `User Control:`: Adds that UI controls MUST be discoverable, labeled, and keyboard accessible.
2.  `Default Behavior > Production Mode:`: Adds that telemetry should be opt-in.
3.  `Privacy:`: Adds transparency about data collection.

**XXVII. NEW Section 39. ACCESSIBILITY AND INCLUSIVITY STANDARDS:**
*This entire section (39.1 to 39.7) is new and provides comprehensive guidelines based on WCAG POUR principles, keyboard accessibility, screen reader support (ARIA), visual accessibility, interaction alternatives, user-configurable options, and testing.*

**XXVIII. Screenshots Section:**
*Conceptual descriptions are significantly expanded with italicized notes on accessibility considerations for each figure (e.g., contrast, focus order, ARIA labels, keyboard navigation, screen reader announcements).*

**XXIX. Final Document Paragraph:**
1.  Original: `...and NUI best practices.`
2.  New: `...NUI best practices, and evolving accessibility guidelines.`

---

## Instructions for a Coding Agent:

The agent's task is to modify the `original_doc` to become the `new_doc` by adding the specified sections and text.

**Preamble:**
"You are a coding agent. Your task is to modify the `original_doc` to incorporate accessibility guidelines, transforming it into the `new_doc`. Apply the following changes precisely. When instructed to 'add text' or 'modify text', locate the specified original text and make the change. When instructed to 'add a new subsection/section', insert it at the specified location."

**Instructions:**

1.  **Meta Document Changes:**
    *   In the initial front matter, locate the `COMMENTS` block. Change the line `| OpenAgents Team |` to `| OpenAgents Team - Accessibility Update |`.
    *   In the same block, change `XX pages` to `30 pages`.
    *   Locate the line `(contact@openagents.com)`. Append ` - Committed to Accessibility` to it.
    *   Globally, in all page footers (e.g., `Source: OpenAgents Inc. Page 0001 of 00XX`), change `00XX` (the total page count part) to `0030`.

2.  **Page 3: Quick Overview:**
    *   Modify Point 1: Append `, Inclusive by Design:` after "NUI First". Append `, while ensuring robust alternative input methods (keyboard, mouse) for full accessibility.` to the end of the sentence.
    *   Modify Point 2: Append `, manageable via keyboard and other assistive technologies.` to the end.
    *   Modify Point 3: Append `, with clear and accessible feedback mechanisms.` to the end.
    *   Modify Point 4: Append `, with accessible transaction information.` to the end.
    *   Modify Point 5: Append `, designed with clear information hierarchy, sufficient contrast, and perceivable feedback for agent control and monitoring.` to the end.
    *   Replace the text of Point 6 with: `**Advanced & Accessible Keyboard Control:** Commander implements comprehensive keyboard support, including standard navigation and a sophisticated system of hotkeys (StarCraft-inspired), ensuring all functionality is operable via keyboard for efficiency and accessibility.`
    *   Replace the text of Point 7 with: `**Consistent Dark Theme with Accessibility Focus:** The application enforces a dark theme with carefully chosen color palettes ensuring sufficient contrast ratios (aiming for WCAG AA). Future iterations will explore user-configurable high-contrast modes and other visual accessibility options.`
    *   After Point 9, add a new Point 10:
        ```
        10. **Commitment to Accessibility Standards:** Commander is designed and developed with a commitment to accessibility, aiming to meet or exceed Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, ensuring usability for people with diverse abilities. (See Section 39)
        ```

3.  **Page 4: Table of Contents (ToC):**
    *(Agent Note: This will require re-calculating page numbers for all subsequent entries if done manually. For an agent, precise line insertion is better. The agent should add new lines and update existing ones if it can parse and re-render ToC with correct page numbers. If not, it might be simpler to replace the entire ToC block, but the instruction is to add sections.)*
    *   Under section 3, before section 4, add the line:
        `   3.5 Accessibility Considerations for NUI ............... 4`
    *   Under section 4, before section 5, add the line:
        `   4.3 Keyboard Navigation and Interaction Standards ...... 5`
    *   Locate the line for `9.5 Moving a Pane (Mouse & Hand)`. Change it to:
        `   9.5 Moving a Pane (Mouse, Hand, Keyboard) .............. 10`
    *   Locate the line for `9.6 Resizing a Pane (Mouse)`. Change it to:
        `   9.6 Resizing a Pane (Mouse, Keyboard) .................. 11`
    *   Under section 33, before section 34, add the line:
        `    33.5 Accessibility Settings (Future) ................. 21`
    *   Before `Screenshots`, add the entire new Section 39 block:
        ```
        39. Accessibility and Inclusivity Standards ............ 26
            39.1 Core Principles (WCAG) ........................ 26
            39.2 Keyboard Accessibility ........................ 26
            39.3 Screen Reader Support (ARIA) .................. 26
            39.4 Visual Accessibility (Color, Contrast, Text) .. 27
            39.5 Interaction Modality Alternatives ............. 27
            39.6 User-Configurable Options ..................... 27
            39.7 Testing and Validation ........................ 27
        ```
    *   Change `Screenshots .............................................. 26` to `Screenshots .............................................. 28`.
    *   Change `Last pages: 23` to `Last pages: 30`.
    *(Agent must update all intermediate page numbers in the ToC based on these additions.)*

4.  **Section 0. INTRODUCTION:**
    *   In Paragraph 1, after "simplicity and power,", add: `**underpinned by a commitment to inclusivity and accessibility.**`.
    *   In Paragraph 1, after "intuitive to use", add: `**for everyone**`.
    *   In Paragraph 1, after "consistent", add: `**and accessible**`.
    *   In Paragraph 2, after "simplicity, power,", add: `**and broad accessibility.**`.
    *   In Paragraph 3, after "system features", replace "should be extensible to similar occasions," with `**must be extensible and robust, considering diverse user needs and assistive technologies,**`.

5.  **Section 1. DISPLAY:**
    *   **1.2 Heads-Up Display (HUD):** At the end of the last sentence, add: `, while ensuring all information is perceivable and operable through various means.`
    *   **1.3 Theme and Appearance:**
        *   After the first sentence, add: `This theme is designed to meet WCAG 2.1 Level AA contrast ratios for text and interactive elements against their backgrounds.`
        *   After the "Accent Colors" bullet point, add these two new bullet points:
            ```
            - **Contrast:** All UI text and graphical elements critical for understanding content or operating functionality MUST maintain a minimum contrast ratio of 4.5:1 (for normal text) or 3:1 (for large text and graphical objects/UI components) against their immediate background. Tools like a contrast checker MUST be used during design and development.
            - **Color Use:** Color MUST NOT be used as the sole means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. Alternative visual cues (e.g., icons, text labels, underlines, shape changes) MUST be provided.
            ```
        *   In the last paragraph, replace "User control over themes is not a current feature." with: `While user control over themes is not a current primary feature, future iterations will explore options such as a high-contrast mode and light theme alternatives to cater to a wider range of visual preferences and needs.`
    *   **1.4 Typography:**
        *   After the first sentence, add: `This font has been chosen for its clarity and legibility in a technical context.`
        *   At the end of the section, add these new bullet points:
            ```
            - **Font Size:** Default font sizes MUST be sufficient for readability (e.g., minimum 12-14pt equivalent for body text, depending on context and viewing distance assumptions for a HUD).
            - **Text Scaling:** The UI MUST support text scaling up to 200% without loss of content or functionality, and without requiring horizontal scrolling for full lines of text. This can be achieved through browser zoom or application-specific settings (future).
            - **Line Spacing (Leading) and Spacing:** Sufficient line spacing (at least 1.5 times the font size) and paragraph spacing (at least 2 times the font size) should be used for blocks of text to improve readability. Letter spacing (tracking) and word spacing must also be adequate.
            - **Text on Images/Complex Backgrounds:** If text is rendered over images or dynamic backgrounds, it MUST have a solid or sufficiently opaque backing, or a text shadow/outline, to ensure contrast requirements are met.
            ```

6.  **Section 2. MOUSE AND CURSOR:**
    *   After the first paragraph describing mouse movement, and before "Within Commander:", add the following new sub-heading and content:
        ```
        **Accessibility Considerations:**
        - While the mouse is a supported input method, all functionalities achievable by mouse interaction MUST also be fully operable via keyboard (see Section 4 and 39.2) and, where appropriate, NUI (Section 3) or Voice Commands (Section 34). No functionality should be exclusively mouse-dependent.
        - Cursor changes that convey information (e.g., resize arrows, grab hand) MUST have alternative non-visual cues for users who cannot see the cursor or its shape. For custom interactive elements, ARIA attributes should be used to describe the element's role and state (see Section 39.3).
        ```

7.  **Section 3. HAND TRACKING (NUI):**
    *   At the end of Section 3.4, add the new subsection:
        ```markdown
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
        ```

8.  **Section 4. KEYBOARD:**
    *   In the first sentence, after "input method for Commander,", add: `crucial for both power users and accessibility.`
    *   **4.1 Standard Text Input:** At the end of the subsection, add:
        `All text input fields MUST be accessible via keyboard, support standard editing commands, and be clearly labeled (e.g., using \`<label>\` for HTML inputs, or \`aria-labelledby\` for custom components, ensuring association for assistive technologies).`
    *   **4.2 Hotkeys & Keybindings:**
        *   In the "Memorability & Learnability" bullet, replace "Contextual cues or an interactive tutorial system may be developed." with: `(Future) An accessible in-app guide or help section detailing all hotkeys should be provided.`
        *   Replace the "Customization" bullet point text with: `(Future) Users MUST be able to customize keybindings to avoid conflicts with assistive technology or OS-level shortcuts, and to suit their personal preferences or physical needs. The ability to disable specific hotkeys should also be considered. (See Section 33.5)`
    *   After Section 4.2, add the new subsection:
        ```markdown
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
        ```

9.  **Section 5. SYSTEM STATE AND PERSISTENCE:**
    *   Under `User Preferences:`, after the "Telemetry" bullet, add:
        `- **Accessibility Preferences (Future):** Persisted settings for font size adjustments, high-contrast mode selection, reduced motion preferences, NUI sensitivity levels, and custom keybindings. (See Section 33.5)`

10. **Section 6. INITIALIZATION:**
    *   In point 4 (`Pane System`), at the end of the second sentence, add: `Any persisted accessibility settings (future) would also be applied here.`

11. **Section 7. EVERYDAY OPERATION:**
    *   In the `Information Display:` bullet, after "Bitcoin balance", add: `, ensuring text is legible and information is structured for clarity.`
    *   In the `Interaction: > Keyboard:` bullet, after "(chat, forms),", add: `comprehensive UI navigation, pane manipulation,`.
    *   In the `Agent Commands:` bullet, at the end of the sentence, add: `using accessible feedback methods.`
    *   In the `Pane Management:` bullet, at the end of the sentence, add: `All management functions must be keyboard accessible.`
    *   In the `Settings:` bullet, after "telemetry", add: `and accessibility options (See Section 33)`.
    *   In the final paragraph of the section, at the end of the sentence, add: `, irrespective of their preferred input modality or abilities.`

12. **Section 8. WHAT THE SCREEN LOOKS LIKE (HUD LAYOUT):**
    *   **8.1 Background Grid:** At the end of the section, add: `The grid's color and intensity MUST be subtle enough not to interfere with the legibility of foreground text and interactive elements. Contrast between the grid and key HUD elements must be considered.`
    *   **8.2 Pane Manager Area:** At the end of the section, add: `The focus order among panes must be logical and controllable via keyboard.`
    *   **8.3 Core HUD Elements (Intro paragraph):** After the first sentence, add: `All HUD elements, whether fixed or within panes, MUST have sufficient contrast. Iconic buttons or controls MUST have accessible names (e.g., via \`aria-label\` or visually hidden text) if their meaning is not clear from context or an adjacent visible label. (See Section 39.3)`
    *   **8.3.1 Chat Window:** At the end of the description, add: `Text input must be labeled for assistive technologies. Chat messages should be structured semantically for screen reader navigation.`
    *   **8.3.2 Hotbar:** In the `Current Status:` line, after "hand gesture selection", add: `, ARIA roles for buttons`.
    *   **8.3.3 Inspector Window:** At the end of the description, add: `Content must be structured accessibly (e.g., proper heading levels, lists).`
    *   **8.3.4 Bitcoin Balance Display:** At the end of the description, add: `Text must meet contrast requirements.`
    *   **8.4 Control Elements (Intro paragraph):** After the first sentence, add: `These buttons MUST have clear visual focus indicators and accessible names (e.g., \`aria-label\`). Their state (e.g., 'Hand Tracking On/Off') MUST be programmatically determinable via ARIA attributes (e.g., \`aria-pressed\`).`
    *   **8.4.1 Hand Tracking Toggle:**
        *   After the "Icon:" line, add: `_ \`aria-label="Toggle Hand Tracking"\` required.`
        *   At the end of the "Visual State:" line, add: `State conveyed by \`aria-pressed\`.`
    *   **8.4.2 Pane Creation Buttons:**
        *   After the main heading, add: `They MUST have accessible names.`
        *   For "New NIP-28 Channel Button", after "Icon: `MessageSquarePlus`.", add: `\`aria-label="Open new NIP-28 channel"\` required.`
        *   For "NIP-90 DVM Dashboard Button", after "Icon: `Cpu`.", add: `\`aria-label="Open NIP-90 DVM Dashboard"\` required.`
    *   **8.4.3 Reset HUD Button:** After "Icon: `IconRefresh` (SVG).", add: `\`aria-label="Reset HUD layout"\` required.`

13. **Section 9. PANES:**
    *   **9.1 Basic Pane Appearance:**
        *   In the first paragraph, after "(`shadow-lg`).", add: `Contrast between pane background, border, title bar, and text/icons MUST meet WCAG AA requirements.`
        *   In the "Title Bar:" bullet, at the end, add: `and MUST be keyboard focusable to allow keyboard-based manipulation. It should have appropriate ARIA roles.`
        *   In the "Dismiss Button:" bullet, at the end, add: `This button MUST be keyboard focusable and have an accessible name (e.g., \`aria-label="Close [Pane Title]"\`).`
    *   **9.2 Pane Lifecycle:**
        *   In the "Adding Panes:" bullet, at the end, add: `When a new pane opens and receives focus, screen readers should be notified.`
        *   In the "Removing Panes:" bullet, after "clicking their 'X' button", add: `(or via keyboard, e.g., Esc when button has focus, or a dedicated pane close hotkey)`. At the end, add: `, and focus should be managed logically.`
    *   **9.3 The Active Pane:**
        *   Replace the first bullet point with: `- A more prominent border that is not solely reliant on color (e.g., increased thickness or different style in addition to color change).`
        *   After the (new) first bullet point, add: `- An off-screen text announcement for screen readers (e.g., through an ARIA live region or by updating the window title if appropriate, stating "[Pane Title] active").`
    *   **9.4 Making a Pane Active:** In the last bullet point, after "keyboard commands", add: `(e.g., a hotkey to cycle through panes, like Ctrl+Tab, and Enter/Space to activate the focused pane)`.
    *   **9.5 Moving a Pane:**
        *   Change the title from `(Mouse & Hand)` to `(Mouse, Hand, Keyboard)`.
        *   After the "Hand Pinch-Drag:" bullet, add:
            `- **Keyboard:** When a pane's title bar or the pane itself (as a whole, if designed as such) has focus, users MUST be able to move it using arrow keys, potentially in combination with a modifier key (e.g., Ctrl + Arrow Keys). Clear instructions for keyboard-based pane manipulation should be available in help documentation.`
    *   **9.6 Resizing a Pane:**
        *   Change the title from `(Mouse)` to `(Mouse, Keyboard)`.
        *   In the "Affordance:" bullet, at the end, add: `These handles MUST be keyboard focusable or an alternative keyboard mechanism for resizing must be provided.`
        *   After the "Interaction (Mouse):" bullet, add:
            `- **Interaction (Keyboard):** When a pane or its resize affordance has focus, users MUST be able to resize it using arrow keys (e.g., Alt + Arrow keys, or similar intuitive combination). Clear instructions for keyboard-based resizing must be provided.`
    *   **9.7 Scrolling within Panes:** At the end, add: `Scrollable areas MUST be navigable via keyboard (e.g., arrow keys, Page Up/Down, Home, End when the scrollable area or an element within it has focus). Custom scrollbars, if used, MUST be keyboard operable if they are interactive and provide appropriate visual cues and ARIA attributes if they are custom controls.`
    *   **9.8 Pane Types:** At the end of the introductory paragraph, add: `Content within each pane type must adhere to accessibility standards relevant to its nature (e.g., forms, text display, lists).`

14. **Section 10. THE SELECTION (TEXT AND CONTENT):**
    *   In the "Content Selection:" bullet, at the end, add: `and MUST be keyboard operable (e.g., arrow keys to navigate, Space to select/deselect).`
    *   After the last bullet, add: `- **Visual Indication:** Selection styling MUST provide sufficient contrast against both selected and unselected content and backgrounds (see Section 1.3).`

15. **Section 11. VISIBILITY OF OPERATIONS ON SELECTIONS:**
    *   In the "Context Menus (Future):" bullet, at the end, add: `Context menus MUST be keyboard-operable (e.g., via Shift+F10 or context menu key) and navigable using arrow keys, Enter/Space to activate, and Esc to close. (See Section 39.3 for ARIA menu patterns).`
    *   In the "Dedicated UI Elements:" bullet, at the end, add: `These elements must be keyboard accessible.`

16. **Section 12. MARKING A SELECTION:**
    *   In the "Text:" bullet, replace "(often a blue background with inverted text color)." with: `or an application-defined color that meets contrast requirements (see Section 1.3).`
    *   In the "UI Elements:" bullet, at the end, add: `that is not solely reliant on color and meets contrast requirements. ARIA attributes like \`aria-selected="true"\` MUST be used.`

17. **Section 13. THE MENU BAR AND IN-APP MENUS:**
    *   **13.1 Application Menu Bar:** In the "Standard Menus:" bullet, at the end, add: `Native menus are generally accessible by default, but custom menu items must have clear, descriptive labels and appropriate mnemonics where applicable.`
    *   **13.2 In-App Navigation Menus:** In the "Interaction:" bullet, replace "Keyboard navigation (Tab, Enter) is supported by the underlying Radix UI primitives." with: `These menus MUST use appropriate ARIA roles (e.g., \`navigation\`, \`menubar\`, \`menuitem\`) to ensure they are understandable to assistive technologies. Keyboard navigation (Tab, arrows, Enter, Esc) MUST be fully supported by the underlying Radix UI primitives.`
    *   **13.3 Contextual "Menus" within Panes:** At the end, add: `and MUST follow ARIA menu patterns for keyboard interaction and screen reader support.`

18. **Section 15. MENU ITEMS THAT DO NOTHING (DISABLED ITEMS):**
    *   In the "In-App Navigation Menu/Buttons:" bullet, at the end, add: `They MUST have \`aria-disabled="true"\` set, and their visual styling must clearly indicate their disabled state without relying solely on color (e.g., reduced opacity plus a grayed-out appearance).`

19. **Section 16. CONTENTS OF THE MENU BAR AND MENUS:**
    *   In the "Native Electron Menu Bar > Help:" bullet, after "Documentation links.", add: `Accessibility Information (Future).`

20. **Section 17. MAKING MENU CHOICES FROM THE KEYBOARD:**
    *   At the end, replace "for keyboard accessibility." with: `for keyboard accessibility and MUST support activation via Enter/Space and navigation using arrow keys if they are structured as ARIA menus/menubars.`

21. **Section 18. THE DIALOG BOX / MODALS:**
    *   In the "Appearance:" bullet, at the end, add: `Text and controls within dialogs must meet contrast requirements.`
    *   After the "Interaction:" bullet and before the `_(Specific dialog implementations...)` note, add the new sub-heading and content:
        ```markdown
        - **Accessibility Standards:** Dialogs/Modals MUST adhere to the following:
            - **Focus Management:** When a dialog opens, focus MUST be moved to an interactive element within the dialog (often the first input field or the primary action button). Focus MUST be trapped within the dialog (i.e., tabbing should cycle within the dialog and not go to elements behind it) until it is closed. Upon closing, focus MUST return to the element that triggered the dialog, or a well-defined logical predecessor.
            - **Keyboard Operation:** Dialogs MUST be dismissible via the \`Esc\` key. All interactive elements within the dialog MUST be keyboard accessible and follow a logical tab order.
            - **ARIA Attributes:** Dialogs MUST use \`role="dialog"\` (or \`role="alertdialog"\` if it's an alert requiring immediate user attention). \`aria-modal="true"\` MUST be set. The dialog MUST have an accessible name, typically provided by \`aria-labelledby\` referencing a visible dialog title element (e.g., \`<h2 id="dialog-title">...\</h2\> \<div role="dialog" aria-labelledby="dialog-title"\>...\</div\>\`). If there's descriptive text, \`aria-describedby\` can be used.
        ```

22. **Section 19. TEXT EDITING PHILOSOPHY:**
    *   In the "Components:" bullet, at the end, add: `These components MUST be associated with visible labels using \`<label for="...">\` or ARIA properties (\`aria-labelledby\`) for accessibility.`
    *   In the "NUI Interaction:" bullet, at the end, add: `, ensuring any such feature is also accessible.`

23. **Section 20. TYPING PRINTING CHARACTERS:**
    *   In the second bullet point, at the end, add: `Any custom auditory feedback must be user-configurable.`

24. **Section 21. KEYS THAT ALTER THE MEANING OF OTHER KEYS (MODIFIERS):**
    *   In the "Application-Specific Modifiers (Hotkeys):" bullet, after the examples, add: `These hotkeys must be customizable to avoid conflicts with assistive technologies. (See Section 33.5)`

25. **Section 23. ALPHA LOCK (CAPS LOCK):**
    *   At the end, add: `Its state should not be relied upon for application logic, as users may use it for accessibility reasons.`

26. **Section 24. CODE (SPECIAL KEYS FOR HOTKEYS):**
    *   In the "Esc:" bullet, replace "open a main menu/pause." with: `close dialogs/menus, or blur focus from an input.`
    *   In the last bullet, replace "is TBD." with: `is TBD and will be designed with common keyboard accessibility patterns in mind, avoiding conflicts with OS or assistive technology shortcuts where possible, and allowing for user customization.`

27. **Section 25. REPEATING KEYS:**
    *   In the second sentence, after "lists", add: `, or for adjusting values in custom controls (e.g., sliders)`.

28. **Section 27. BACKSPACE KEY:**
    *   In the last bullet point, at the end, add: `, but this requires careful design to avoid accidental deletions and should include a confirmation step if destructive.`

29. **Section 28. TAB KEY:**
    *   Replace the text of the last bullet point with: `Within text areas (\`Textarea\`), TAB may insert a tab character. If so, users must be able to exit the textarea using another key combination (e.g., Ctrl+Tab, or Esc to blur and then Tab). Standard WAI-ARIA practices for text areas should be followed. Commander uses Shadcn UI components which generally follow these.`

30. **Section 30. THE EDIT MENU (SYSTEM LEVEL):**
    *   **30.4 Undo:** At the end, add: `, but if implemented, it must be clearly communicated and accessible.`

31. **Section 31. UTILITY PANES:**
    *   In the "NIP-28 Channel Pane" bullet, at the end, add: `Chat content must be accessible (see Section 8.3.1).`
    *   In the "NIP-90 DVM Dashboard Pane" bullet, at the end, add: `(all form fields must be labeled and keyboard accessible) and an event list (list items must be keyboard navigable and selectable, with states announced to assistive technologies).`
    *   In the "Chats List Pane" bullet, at the end, add: `List items must be keyboard navigable and provide accessible names.`
    *   In the "Changelog Pane" bullet, at the end, add: `, structured with proper headings for easy navigation.`
    *   In the "Inspector Pane" bullet, at the end, add: `Content must be structured semantically.`
    *   At the end of the section, add: `These utility panes adhere to the general pane behaviors outlined in Section 9 (draggable, resizable, activatable), including all keyboard accessibility requirements for these actions.`

32. **Section 32. THE SCRAP (SYSTEM CLIPBOARD):**
    *   At the end, add: `All copyable content must be selectable via keyboard.`

33. **Section 33. USER PROFILE AND SETTINGS:**
    *   In the first sentence, after "by the application", add: `and must be accessible via keyboard.`
    *   **33.1 Language Settings:** In the second bullet, at the end, add: `This toggle must be keyboard accessible and announce its state.`
    *   **33.2 Theme Settings (Forced Dark):** At the end of the last bullet, add: `Future development will include user-selectable themes, including a high-contrast option and potentially a light theme, to cater to different visual accessibility needs. (See Section 33.5)`
    *   **33.4 Telemetry Settings:**
        *   In the "User Control:" bullet, at the end, add: `This toggle MUST be easily discoverable and keyboard accessible.`
    *   At the end of Section 33.4, add the new subsection:
        ```markdown
            **33.5 Accessibility Settings (Future)**
            A dedicated section within User Settings will provide controls for accessibility-related preferences. All settings within this section MUST be keyboard accessible and clearly labeled, with changes providing immediate or clear feedback. These may include:
            - **Text Size:** Options to increase or decrease global UI font size, with changes reflowing content correctly.
            - **High-Contrast Mode:** A toggle to enable a theme with enhanced contrast ratios beyond the default dark theme, or a user-selectable choice of specific high-contrast themes.
            - **Reduced Motion:** An option to minimize or disable UI animations and transitions for users sensitive to motion. This should respect OS-level reduced motion settings if available.
            - **NUI Adjustments:** Controls for hand tracking sensitivity, gesture customization, or disabling NUI entirely.
            - **Keyboard Shortcut Customization:** Interface to view and remap hotkeys to avoid conflicts and suit user needs.
            - **Auditory Feedback Preferences:** Controls for enabling/disabling or adjusting volume of UI sounds.
            - **Focus Indicator Customization:** (Advanced) Options to change the appearance (color, thickness) of the keyboard focus indicator.
        ```

34. **Section 34. VOICE COMMANDS:**
    *   **34.1 Philosophy and Invocation (Future):**
        *   In the "Activation:" bullet, at the end, add: `This is crucial to avoid accidental command execution and must be accessible.`
        *   After the "Activation:" bullet, add a new bullet:
            `- **Alternative to Physical Input:** Voice commands can serve as a valuable accessibility feature for users with motor impairments or those who cannot use hand tracking or keyboard/mouse effectively.`
        *   In the "Feedback > Visual:" bullet, at the end, add: `(e.g., a microphone icon changing state, with sufficient contrast).`
        *   In the "Feedback > Auditory:" bullet, at the end, add: `These must be configurable.`
        *   After the "Feedback > Auditory:" bullet, add a new bullet:
            `- **Textual:** A transcript or textual confirmation of recognized commands should be available for users who are deaf or hard of hearing, or who prefer visual confirmation.`
        *   In the "Context-Sensitivity:" bullet, at the end, add: `This context should be clearly communicated.`
        *   After the "Context-Sensitivity:" bullet, add a new bullet:
            `- **Error Recovery & Clarity:** Clear mechanisms for correcting misrecognized commands (e.g., "cancel that," "try again") and unambiguous feedback are essential. Users should be able to easily exit voice input mode.`
    *   **34.2 Available Commands (Future - Illustrative Examples):**
        *   Add a new example command to the list: `- "Commander, read active pane content." (Example accessibility command)`
    *   In the `_(Detailed specification...)` note, at the end, add: `, with accessibility as a core consideration.`

35. **Section 35. NOSTR INTEGRATION:**
    *   In the introductory paragraph, at the end, add: `UI elements related to Nostr features must be accessible.`
    *   **35.1 NIP-04 Encrypted Direct Messages:** At the end, add: `UI for sending/receiving DMs must be accessible, with clear indication of encryption status.`
    *   **35.2 NIP-19 Identifiers:** At the end, add: `These identifiers must be selectable and copyable via keyboard. Long identifiers should be presented in a way that doesn't break layout, possibly with truncation and a tooltip/button to reveal the full ID.`
    *   **35.3 NIP-28 Public Chat Channels:** In the second bullet, at the end, add: `Chat accessibility standards apply (see Section 8.3.1).`
    *   **35.4 NIP-90 Data Vending Machines (DVMs):** At the end, add: `All form elements MUST be labeled and keyboard accessible. The event list must be navigable via keyboard, and job statuses clearly indicated and announced to assistive technologies.`

36. **Section 36. BITCOIN INTEGRATION (SPARK SDK):**
    *   In the "UI (Future/Conceptual):" bullet:
        *   After "output of `getBalance`.", add: `This display must be clearly legible and its content available to screen readers.`
        *   After "wallet functions.", add: `These interfaces MUST be fully accessible, with clear labeling of amounts, addresses, fees, and action buttons. Confirmation steps for transactions are critical.`
    *   In the "Error Handling:" bullet, at the end, add: `Error messages MUST be presented in an accessible way (e.g., not just color-coded, but with clear text and ARIA alerts if appropriate).`

37. **Section 37. AGENT INTERACTION MODEL:**
    *   In the first sentence, after "facilitate this effectively", add: `and accessibly.`
    *   In the "Agent Representation (Conceptual):" bullet, at the end, add: `Agent representations must have accessible names and their states (e.g., busy, idle, error) must be perceivable through non-visual means as well.`
    *   In the "Command Issuance: > Chat:" bullet, at the end, add: `Chat accessibility is paramount.`
    *   In the "Command Issuance: > Direct Manipulation (Future NUI):" bullet, at the end, add: `Keyboard/mouse alternatives are mandatory.`
    *   In the "Feedback:" bullet, after "communicated to the user,", add: `This includes:`. Then convert the rest of that sentence into a bullet point, and add a new one:
        ```
        - Visually distinct updates with sufficient contrast.
        - Text-based messages in chat or status panes.
        - (Future) ARIA live regions or other non-intrusive announcements for screen readers for critical status changes or agent outputs. (See Section 39.3)
        ```
    *   In the "Earning Bitcoin:" bullet, at the end, add: `, with earnings and related information presented accessibly.`
    *   In the `_(Detailed specifications...)` note, replace "TBD.)" with: `TBD and will be developed with accessibility in mind.)`

38. **Section 38. TELEMETRY STANDARDS:**
    *   In the "User Control:" bullet, after "opt-in/out of telemetry.", add: `This control must be easily discoverable, clearly labeled, and keyboard accessible. (See Section 33.4).`
    *   In the "Default Behavior: > Production Mode:" bullet, after "(if configured).", add: `Telemetry should be opt-in by default, respecting user privacy.`
    *   In the "Privacy:" bullet, at the end, add: `The nature of data collected should be transparent to the user.`

39. **NEW Section 39. ACCESSIBILITY AND INCLUSIVITY STANDARDS:**
    *   Before the "Screenshots" section (Page 26 in original, becomes Page 28), insert the entire new Section 39:
        ```markdown
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
            - **Roles:** Define the purpose of a component (e.g., \`role="button"\`, \`role="dialog"\`, \`role="tablist"\`, \`role="tab"\`, \`role="tabpanel"\`).
            - **States & Properties:** Communicate the current condition or characteristics of an element (e.g., \`aria-pressed="true"\`, \`aria-expanded="false"\`, \`aria-label="Close"\`, \`aria-disabled="true"\`, \`aria-selected="true"\`).
        - All images, icons, and non-text content that convey meaning MUST have appropriate text alternatives (e.g., \`alt\` text for images, \`aria-label\` for iconic buttons). Decorative elements should be hidden from assistive technologies (e.g., \`aria-hidden="true"\` or empty \`alt=""\`).
        - Dynamic content updates (e.g., chat messages, status updates, notifications) SHOULD use ARIA live regions (\`aria-live="polite"\` or \`aria-live="assertive"\` as appropriate, \`aria-atomic\`, \`aria-relevant\`) to inform users of changes without unnecessarily shifting focus.
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
        ```

40. **Screenshots Section (Now Page 28):**
    *   **Figure 1:** At the end of the description, add:
        `_ _All text elements shown would meet contrast requirements. Focus order through interactive elements (buttons, pane headers) would be logical and visually indicated._`
    *   **Figure 2:** At the end of the description, add:
        `_If keyboard dragging is active, the pane title bar would show a clear focus indicator, and visual feedback (e.g., position numbers) would update._`
    *   **Figure 3:** At the end of the description, add:
        `_Resize handles or the pane itself would be focusable for keyboard resizing, with clear instructions or cues._`
    *   **Figure 4:**
        *   After the "streaming" indicator description, add: `, which should be conveyed to screen readers if it indicates a loading state.`
        *   After the "Send" button description, add: `_Input area would have an associated label for screen readers (e.g., \`aria-label="Type your message"\`). Messages would be structured semantically (e.g., in a list or using appropriate ARIA roles) for screen reader navigation._`
        *   At the end of the custom scrollbars description, add: `and are keyboard operable.`
    *   **Figure 5:**
        *   After the text overlays description, add: `Text must be high contrast.`
        *   At the end of the description, add: `_Normal operation would not rely on this visual feedback for NUI interactions; alternative feedback mechanisms are key._`
    *   **Figure 6:**
        *   After the "Publish Encrypted Job Request" button description, add: `_Form fields would be properly labeled (e.g., using \`<label for="...">\` or \`aria-labelledby\`), have visible focus states, and validation errors would be announced accessibly._`
        *   After the job results and feedback description, add: `_The event list would be keyboard navigable (e.g., up/down arrows), and each item selectable/activatable with Enter/Space. Screen reader announcements would convey job statuses or updates dynamically (e.g., via ARIA live regions)._`
    *   Replace `**(Further figures would detail other specific UI states, dialogs, or interactions as the application evolves.)**` with:
        `**(Further figures would detail other specific UI states, dialogs, or interactions as the application evolves, each with accessibility considerations noted.)**`

41. **Final Document Paragraph:**
    *   Replace `...and NUI best practices.` with: `...NUI best practices, and evolving accessibility guidelines.`
