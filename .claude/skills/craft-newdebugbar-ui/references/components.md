# Component system

This file documents implemented reusable components and the boundary between shared patterns and inspector-specific modules. Verify the current React API in the component's `.jsx` source before using a prop; a design proposal does not establish a supported API.

Shared components live in `resources/js/ui/components` as PascalCase `.jsx` files with named exports, such as `InspectorFacts.jsx` exporting `InspectorFacts`. A file does not become shared merely because it lives in `resources/js/ui/components`. Reuse and a stable product-level rule make it shared.

## Ownership boundary

Use these ownership levels:

1. **Shared primitives** own one visual or interaction rule, such as a field, badge, source link, or code block.
2. **Shared inspector patterns** own recurring composition and behavior across independent inspectors, such as a detail header, fact grid, or list-detail workspace.
3. **Private inspector modules** own inspector-specific labels, filters, rows, tabs, data normalization, and evidence. They belong to one named product area.

A shared component may depend only on another shared component. A private module may compose shared components. One inspector's private module must not become another inspector's dependency; extract the shared visual rule instead.

Private modules live with their inspector in `resources/js/ui/inspectors/{area}/`, and shell chrome lives in `resources/js/ui/shell/`. A private file that lives in `resources/js/ui/components` is still private; its location does not make it shared. Keep its API tied to one product area until a real cross-inspector rule is worth extracting.

## When a component is shared

Make a component public only when at least one of these is true:

- Two independent product owners reuse the same visual or interaction rule.
- It is a foundational control or layout pattern that the product deliberately standardizes.

It must also satisfy all of these:

- Its API describes product semantics rather than one inspector's incidental markup.
- It does not expose inspector-specific state names.
- Its important behavior or markup has focused test coverage through a real consumer or a bounded fixture.
- It is the single canonical treatment for its role.

Similar inspector layouts do not justify a large component with many conditional props. Share stable geometry through node props such as `title`, `aside`, `list`, and `detail`, and keep domain-specific content private.

Shared owners also own their default Tailwind typography, spacing, and divider treatment. Do not override those defaults with `className` in every consumer to create a new visual language. Change the owner, check its real consumers, and remove obsolete local overrides together.

## Shared primitives

| Component                 | Use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CodeBlock`               | Syntax-highlighted code or retained code-like data. Pass the real `language` and the text as `source`; never use it for an ordinary path or label. Owns the shared `ndb:p-4`, `ndb:text-sm`, `ndb:leading-6`, and `ndb:rounded-lg` code surface. Soft wrapping is on by default and preserves content; use `wrap={false}` when keeping preformatted lines is useful. The same file exports `HighlightedCode` for highlighted code without the panel; use one of them for every `data-ndb-language` element. |
| `EmptyState`              | Calm no-results or inspector-empty message. Use `description` only for useful next context, `centered` for a full workspace empty state, and `success` only for a genuinely positive result.                                                                                                                                                                                                                                                                                                                |
| `FilterTab`               | One option inside `FilterTabs`. Express selection with `aria-selected` or `aria-pressed`; do not use it alone.                                                                                                                                                                                                                                                                                                                                                                                              |
| `Icon`                    | Package-owned SVG at an explicit supported `size` (3, 3.5, 4, or 5). Prefer text when an icon would be ambiguous.                                                                                                                                                                                                                                                                                                                                                                                           |
| `IconButton`              | Accessible icon-only action. Always provide an accessible name with `aria-label`.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `InspectorAction`         | Quiet labeled action beside the evidence it affects. Its shared default supplies the treatment; there are no visual variants.                                                                                                                                                                                                                                                                                                                                                                               |
| `InspectorOperationBadge` | Neutral HTTP method, cache-operation, or Redis-command badge with shared width presets. Use `compact` for short query classifications and `wide` for longer operations. `outlined` is an available treatment, not a requirement for detail headers; Requests keeps its borderless method badge.                                                                                                                                                                                                             |
| `InspectorSourceLink`     | Underlined application-source action with no ornamental icon, padding, or hover fill. Pass `copy` when activation should copy the displayed location; keep that interaction inside the shared component.                                                                                                                                                                                                                                                                                                    |
| `InspectorSortHeading`    | Clickable heading for a meaningful sortable column in a table-like list. Pass explicit `active` and `direction` values and an `onClick`, keep its fixed indicator slot, and make the parent own the sort cycle and deliberate default order. Do not pair it with a duplicate sort dropdown.                                                                                                                                                                                                                 |
| `SearchField`             | Shared labeled search input with the icon fixed on the left and balanced inset spacing. Do not add a right-icon variant.                                                                                                                                                                                                                                                                                                                                                                                    |
| `SelectField`             | Native select with stable field geometry. Use for one list-filter dimension rather than a segmented strip.                                                                                                                                                                                                                                                                                                                                                                                                  |

## Shared inspector patterns

| Component                 | Use                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FilterTabs`              | Accessible tabs or segmented-control group. Give it a concrete `label` and place only `FilterTab` children inside it.                                                                                                                                                                                                                                       |
| `InspectorDefinitionList` | Stack `InspectorDefinitionRow` children with one divider system.                                                                                                                                                                                                                                                                                            |
| `InspectorDefinitionRow`  | One label/value pair. Pass `label` for static text or `term` (with optional `termProps`) for a computed or rich term; use `tone="danger"` only for an actual failed or harmful state.                                                                                                                                                                       |
| `InspectorDetailBack`     | Mobile drill-in Back action. Use `persistent` only when the desktop flow truly needs it.                                                                                                                                                                                                                                                                    |
| `InspectorDetailEmpty`    | Center a short selection instruction in an unselected detail pane.                                                                                                                                                                                                                                                                                          |
| `InspectorDetailHeader`   | Stable selected-item identity and optional actions. Use `layout="grid"` for fixed action placement and `layout="wrap"` for long identities. Pass one root element as `title`; wrap class, message, or other multi-line identity content together. Optional `aside`, `identity`, and `metadata` nodes add actions, a boxed identity, and a metadata row.     |
| `InspectorDetailPane`     | Detail scroll owner and query container with mobile drill-in behavior. Supply the real `detailOpen` state, `detailRef`, `detailLabel`, and `backLabel` with `onClose` (or a replacement `back` node). Keep responsive facts tied to this pane width.                                                                                                        |
| `InspectorDetailTabs`     | Detail segmented tabs. Center by default; use `align="left"` only when adjacent controls make centering misleading.                                                                                                                                                                                                                                         |
| `InspectorDisclosure`     | Native details for supporting retained evidence, closed by default. Pass `label`; optional `summary` and `count` nodes replace the label or add a count. `resetKey` accepts any value and closes the disclosure whenever it changes, such as the selected item or profile ID. The body renders only while open and is syntax highlighted on opening.        |
| `InspectorEvidence`       | Required `value` text with an optional `label` and compact `aside` node. Choose the actual `language`; it defaults to `json`. Uses `CodeBlock` and forwards its `wrap` option, which defaults to true.                                                                                                                                                      |
| `InspectorExplanation`    | Friendly help for ambiguous evidence and a conditional next check. Pass `title` and `description`; use `heading` and `body` with `headingProps` and `bodyProps` only when the wording needs its own wrapper attributes. Do not explain obvious labels.                                                                                                      |
| `InspectorFact`           | One compact fact inside `InspectorFacts`, with a `label` prop and its value as children. It inherits the parent's layout through context.                                                                                                                                                                                                                   |
| `InspectorFacts`          | Facts that respond to pane width. The default `layout="grid"` supports one, two, or four `columns`; `layout="inline"` makes a compact wrapping fact row. Set `bordered={false}` when the parent already supplies the divider.                                                                                                                               |
| `InspectorListControls`   | Optional `leading` list summary plus `search` and one or two trailing filters (`filter`, `secondaryFilter`). Use `layout="compact"` inside a narrow split-pane list so search owns the first row and two filters share the second. Use the secondary filter only when two independent filters are necessary; do not rebuild either shared grid.             |
| `InspectorListPanel`      | List `controls`, the `list` scroll owner, and the filtered `empty` state.                                                                                                                                                                                                                                                                                   |
| `InspectorSourceFact`     | Plain source label/value row. Set `code` only when the value itself is code, not merely a file location.                                                                                                                                                                                                                                                    |
| `InspectorSourcePanel`    | Source facts followed by a collapsed supporting application stack built from `frames`. Uses one column by default and supports two; accepts optional `title`, an `actions` node, and a `resetKey` for its disclosure. A single primary location can use `InspectorSourceLink`; neither the full panel nor a separate Source tab is required for every item. |
| `InspectorStack`          | Visible bounded call stack when the stack itself is primary evidence. Pass retained `frames`, an accurate `emptyLabel`, and a specific `title` when showing something other than the application stack. Supporting stacks belong in the source panel or a disclosure.                                                                                       |
| `InspectorWorkspace`      | Shared split, focused, or stream workspace. Use `mode="stream"` for a single full-width scrollable list, `frame="top"` for edge-to-edge inspectors, and a namespaced `detailId` in focus mode. Focused details also establish a query container for shared facts.                                                                                           |
| `PopoverSurface`          | Shared elevated menu surface. Without `anchored`, choose `direction` and `align` deliberately; `dynamic` follows the toolbar placement. `anchored` drops the built-in absolute positioning, so the caller must place the surface itself, such as fixed coordinates measured from the trigger, as `RequestMiddleware` and the Livewire `useAnchor` hook do.  |
| `InspectorHeading`        | Restrained `heading` and close `description`. Do not repeat the tab name or explain an obvious label.                                                                                                                                                                                                                                                       |

## Compound families

Some shared files have no useful standalone state. Treat them as compound families with the parent that gives them meaning:

- `FilterTabs` owns `FilterTab`.
- `InspectorDefinitionList` owns `InspectorDefinitionRow`.
- `InspectorFacts` owns `InspectorFact`.

Document each family together and test the child through the parent that gives it meaning.

## Private inspector modules

Requests, HTTP Client, Cache, Mail, Notifications, Models, Events, Authorization, Queries, Logs, Livewire, and toolbar chrome own product-specific modules. Their complete workspaces, row renderers, data panels, state coordinators, and tab definitions are integration surfaces, not design-system components. Requests owns `RequestStep` for lifecycle geometry, `RequestTraceIcon` for its duotone stage icons, and `RequestMiddleware` for the retained middleware list inside the shared anchored popover, all in `resources/js/ui/inspectors/request/`.

Verify those modules in realistic populated product inspectors. A private module may use a small fixture in a focused test, but that does not make it a shared component.

Private modules should contain only domain decisions:

- labels and filters;
- list-column tracks and row content;
- tab order and deliberate defaults;
- captured evidence and empty-state wording;
- inspector state and actions.

They should reuse the shared field, badge, fact, source, code, explanation, and workspace grammar rather than reproduce its markup.

## State and composition

- Stateful shared patterns receive explicit state values, refs, labels, and callbacks from their parent. They do not create a second root store.
- `InspectorWorkspace` owns split/focus/stream geometry; `InspectorListPanel` owns split-list scrolling; `InspectorDetailPane` owns detail scrolling. In stream mode, the workspace body is the only desktop scroll owner.
- `InspectorDetailTabs` supplies the shared segmented container while the private inspector supplies tab labels, order, availability, and active state.
- `InspectorExplanation` is appropriate only when captured evidence needs interpretation or a conditional next check. Its question-title rule does not apply to ordinary headers, identity, or evidence labels.
- Code and evidence components receive retained values. They do not infer a source, result, or problem from adjacent data.

## Copy feedback

`CopyButton` owns the shared three-second feedback and resets when its `copy` value changes. Labels change to “Copied”; icon-only controls show a checkmark and bubble. Pass the value to copy as `copy`. The `IconButton`, `InspectorAction`, and `InspectorSourceLink` components accept the same `copy` prop and retain their own styles. A custom control that needs the same feedback uses the `useCopyControl` hook exported beside `CopyButton`.

## Adding or changing a component

In one change:

1. Decide whether the work belongs to a shared component or a private inspector module.
2. Reuse or edit the canonical shared component when its semantics match.
3. If a new shared component is warranted, add it to this reference and focused coverage.
4. If it is an inseparable child, document and test it with its compound family.
5. Keep private modules within one owning product area.
6. Migrate every intended consumer and delete the superseded implementation in the same vertical slice. Do not leave old and new treatments in parallel.
7. Update focused behavior tests for the affected consumers.
8. Inspect every affected real consumer at desktop and mobile widths in both themes.
