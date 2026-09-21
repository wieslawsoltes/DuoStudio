// Works as a native browser module and as Node ESM without a bundler.
import * as runtime from './duokit.js';
const DuoKit = runtime.default || globalThis.DuoKit;
export const {version, State, Binding, Scope, Environment, UndoManager, effect,
  computed, batch, View, VStack, HStack, ZStack, Text, Button, TextField,
  TextEditor, Toggle, Slider, Picker, Spacer, Divider, List, ForEach, ScrollView,
  NavigationSplitView, TabView, Canvas, Image, WindowGroup, UIViewRepresentable,
  App, render, validateView, fromJSON, safeData, ScenePhase, HorizontalSizeClass} = DuoKit;
export default DuoKit;
