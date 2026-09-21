# DuoKit 3

Independent, MIT-licensed JavaScript application SDK inspired by SwiftUI's composition, state, binding, scene and environment concepts. This is not Apple's SDK, Swift, UIKit or a compatibility runtime for native applications.

## Use the core without Duo Studio

```html
<link rel="stylesheet" href="./sdk/duokit.css">
<div id="app"></div>
<script type="module">
import {State, VStack, HStack, Text, TextField, Button, render} from './sdk/index.mjs';
const state = new State({count: 0, name: 'Duo'});
const renderer = render(document.querySelector('#app'), () =>
  VStack(
    Text(() => `Hello ${state.value.name}`).font('largeTitle').bold(),
    TextField('Name', state.projectedValue.map('name')).id('name'),
    HStack(
      Text(() => state.value.count).font(40),
      Button('Increment', () => state.update(s => ({...s, count: s.count + 1})))
  ).padding(24)
);
// renderer.dispose() releases effects, DOM and observers.
</script>
```

The UMD entry `duokit.js` also supports a normal script tag (`globalThis.DuoKit`) and Node CommonJS. Native browser ESM, Node ESM and TypeScript declarations are included. No runtime dependencies are required by the core.

## Application services in Duo Studio

The optional `host.js` installs against `window.Duo`, after its store and domain engines are present. It owns app registration/mounting, commands, environment, lifecycle scopes, document transactions and drawing surfaces. It is not a standalone implementation of the simulator's filesystem, algorithms or shell.

```javascript
DuoKit.register(
  {id: 'my-editor', name: 'My editor', category: 'Create'},
  DuoKit.UIViewRepresentable(ctx => {
    const state = ctx.state({text: 'Hello'});
    ctx.act('clear', () => state.update(s => ({...s, text: ''})));
    return DuoKit.render(ctx.root, () =>
      DuoKit.VStack(
        DuoKit.TextEditor(state.projectedValue.map('text')),
        DuoKit.Button('Clear', () => ctx.commands.perform('clear'))
      ), {scope: ctx.scope, environment: ctx.environment});
  })
);
```

Use the IDE's New Application action for a portable application containing a JavaScript controller and a `.view.json` interface. `DuoKit.declarative` connects descriptor bindings to state and descriptor actions to named commands. The same keyed renderer powers live UI editing and exported apps.

## API inventory

`State`, `Binding`, `effect`, `computed`, `batch`; `Scope`, `Environment`, `UndoManager`; `View`, `VStack`, `HStack`, `ZStack`, `ScrollView`, `NavigationSplitView`, `TabView`, `List`, `ForEach`, `Text`, `TextField`, `TextEditor`, `Button`, `Toggle`, `Slider`, `Picker`, `Image`, `Canvas`, `Spacer`, `Divider`; `App`, `WindowGroup`, `UIViewRepresentable`; `render`, `fromJSON`, `validateView`, `safeData`.

State updates are synchronous. Use immutable object replacement (`state.update`) rather than mutating fields without assigning. View effects automatically track reads and detach on disposal. Stable view IDs preserve element identity and focused editor state. `UndoManager.transaction` and document mutations are synchronous transactions; perform asynchronous work through a scope, then commit its result.

`NavigationSplitView` is a responsive CSS layout implementation, not UIKit's complete navigation controller. `Canvas` is a 2D drawing view; the domain-specific 3D renderer uses WebGPU with a Canvas fallback through the host. Apple framework names describe familiar architectural concepts, not native API parity.

## Package

```sh
cd sdk
npm pack --ignore-scripts
```

Package name: `@wieslawsoltes/duokit`. The repository produces a tested `.tgz`; publication to an npm registry is a separate operation. See `../docs/SDK_IDE.md` for lifecycle, authoring, debugging, source formats, limits and security.
