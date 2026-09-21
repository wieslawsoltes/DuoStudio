/** DuoKit 3 — independent JavaScript API, not binary/source compatible with Apple SDKs. */
export const version: string;
export type Readable<T> = T | State<T> | Binding<T> | (() => T);
export class State<T> {
  constructor(value: T);
  value: T;
  wrappedValue: T;
  readonly projectedValue: Binding<T>;
  update(fn: (previous: T) => T): T;
  subscribe(fn: () => void): () => void;
}
export class Binding<T> {
  constructor(get: () => T, set: (value: T) => void);
  value: T;
  wrappedValue: T;
  map<K extends keyof T>(key: K): Binding<T[K]>;
  static constant<T>(value: T): Binding<T>;
}
export function batch<T>(action: () => T): T;
export function effect(action: () => void): () => void;
export function computed<T>(expression: () => T): Binding<T> & {dispose(): void};
export class Scope {
  readonly signal: AbortSignal;
  readonly disposed: boolean;
  on(target: EventTarget, type: string, fn: EventListener, options?: AddEventListenerOptions): () => void;
  cleanup<T extends () => void>(fn: T): T;
  timeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>;
  interval(fn: () => void, ms: number): ReturnType<typeof setInterval>;
  task<T>(fn: (signal: AbortSignal) => T | PromiseLike<T>): Promise<T>;
  child(): Scope;
  dispose(): void;
}
export class Environment {
  constructor(values?: Record<string, unknown>, parent?: Environment | null);
  get<T = unknown>(key: string): T;
  set(key: string, value: unknown): void;
  update(values: Record<string, unknown>): void;
  child(values?: Record<string, unknown>): Environment;
}
export class UndoManager<T> {
  constructor(get: () => T, set: (value: T) => void, limit?: number);
  transaction<R>(action: () => R): R;
  undo(): boolean;
  redo(): boolean;
}
export type Styles = Record<string, Readable<string | number | null>>;
export type Child = View | string | number | false | null | undefined | Child[];
export interface ViewProps { id?: string | number; style?: Styles; [name: string]: unknown }
export class View {
  constructor(type: string, props?: ViewProps, children?: Child[]);
  readonly type: string;
  readonly props: ViewProps;
  readonly children: Child[];
  modifier(props: ViewProps): View;
  id(value: string | number): View;
  tag(value: string | number): View;
  padding(value?: string | number): View;
  frame(options?: Partial<Record<'width'|'height'|'minWidth'|'minHeight'|'maxWidth'|'maxHeight', string|number>>): View;
  background(value: string): View;
  foregroundStyle(value: string): View;
  font(value: string | number): View;
  bold(): View;
  cornerRadius(value: number): View;
  opacity(value: number): View;
  disabled(value?: Readable<boolean>): View;
  accessibilityLabel(value: string): View;
  onTapGesture(action: (event: MouseEvent, context: unknown) => unknown): View;
  navigationTitle(value: string): View;
}
export function VStack(...children: Child[]): View;
export function HStack(...children: Child[]): View;
export function ZStack(...children: Child[]): View;
export function ScrollView(...children: Child[]): View;
export function Text(text: Readable<string | number>): View;
export function Button(text: Readable<string>, action: (event: MouseEvent, context: unknown) => unknown): View;
export function TextField(label: string, binding: Binding<string> | State<string>): View;
export function TextEditor(binding: Binding<string> | State<string>): View;
export function Toggle(label: string, binding: Binding<boolean> | State<boolean>): View;
export function Slider(binding: Binding<number> | State<number>, range?: [number, number], step?: number): View;
export function Picker<T extends string>(label: string, binding: Binding<T> | State<T>, options: Readable<Array<T | [T, string]>>): View;
export function Spacer(): View;
export function Divider(): View;
export function List<T>(items: Readable<T[]>, row: (item: T, index: number) => View, key?: (item: T) => string | number): View;
export function ForEach<T>(items: Readable<T[]>, row: (item: T, index: number) => View, key?: (item: T) => string | number): View[];
export function NavigationSplitView(sidebar: View, detail: View): View;
export function TabView(tabs: Readable<Array<{id: string; title: string; view: View}>>, selection: Binding<string> | State<string>): View;
export function Canvas(draw: (context: CanvasRenderingContext2D, size: {width: number; height: number}, app: unknown) => void): View;
export function Image(source: Readable<string>, alt?: string): View;
export interface Scene { type: 'WindowGroup'; body: View | (() => View) }
export interface Representation<C = unknown, A = unknown> { type: 'UIViewRepresentable'; mount(context: C): A }
export interface AppMetadata { id: string; name: string; rank?: number; category?: string; description?: string; [key: string]: unknown }
export function WindowGroup(body: View | (() => View)): Scene;
export function UIViewRepresentable<C, A>(mount: (context: C) => A): Representation<C, A>;
export function App<T extends AppMetadata>(metadata: T, scene: Scene | Representation): T & {scene: Scene | Representation};
export function render(host: HTMLElement, body: View | (() => View), options?: {scope?: Scope; environment?: Environment; context?: unknown}): {update(): void; dispose(): void};
export interface ViewDocument { type: string; id: string; props?: Record<string, unknown>; children?: ViewDocument[] }
export function validateView<T extends ViewDocument>(node: T): T;
export function safeData<T>(data: T): T;
export function fromJSON(node: ViewDocument, options?: {state?: State<Record<string, unknown>>; actions?: Record<string, () => unknown>; draw?: Record<string, (...args: unknown[]) => void>}): View;
export const ScenePhase: { readonly active: 'active'; readonly inactive: 'inactive'; readonly background: 'background' };
export const HorizontalSizeClass: { readonly compact: 'compact'; readonly regular: 'regular' };
/** Available after importing ./host in a Duo Studio host. */
export interface ApplicationContext {
  id: string;
  root: HTMLElement;
  scope: Scope;
  environment: Environment;
  state<T extends Record<string, unknown>>(seed: T): State<T>;
  act(name: string, action: (...args: unknown[]) => unknown): void;
  commands: {perform(name: string, ...args: unknown[]): unknown; names(): string[]};
  debug: {checkpoint(label: string, locals?: Record<string, unknown> | (() => Record<string, unknown>)): Promise<void>};
  services: {download(name: string, data: string | Blob | Uint8Array, type?: string): void; [service: string]: unknown};
  [service: string]: unknown;
}
declare const DuoKit: {
  version: typeof version; State: typeof State; Binding: typeof Binding; Scope: typeof Scope;
  Environment: typeof Environment; UndoManager: typeof UndoManager; effect: typeof effect;
  computed: typeof computed; batch: typeof batch; View: typeof View; VStack: typeof VStack;
  HStack: typeof HStack; ZStack: typeof ZStack; Text: typeof Text; Button: typeof Button;
  TextField: typeof TextField; TextEditor: typeof TextEditor; Toggle: typeof Toggle;
  Slider: typeof Slider; Picker: typeof Picker; Spacer: typeof Spacer; Divider: typeof Divider;
  List: typeof List; ForEach: typeof ForEach; ScrollView: typeof ScrollView;
  NavigationSplitView: typeof NavigationSplitView; TabView: typeof TabView; Canvas: typeof Canvas;
  Image: typeof Image; WindowGroup: typeof WindowGroup; UIViewRepresentable: typeof UIViewRepresentable;
  App: typeof App; render: typeof render; validateView: typeof validateView; fromJSON: typeof fromJSON;
  safeData: typeof safeData; ScenePhase: typeof ScenePhase; HorizontalSizeClass: typeof HorizontalSizeClass;
  register?: (metadata: AppMetadata, representation: Representation | ((context: ApplicationContext) => unknown)) => void;
  declarative?: (metadata: AppMetadata, options: {seed?: Record<string, unknown>; view: string | ViewDocument; actions?: (state: State<Record<string, unknown>>, context: ApplicationContext) => Record<string, (...args: unknown[]) => unknown>}) => void;
};
export default DuoKit;
