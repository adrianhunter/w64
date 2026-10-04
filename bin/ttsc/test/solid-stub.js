// A tiny "universal" renderer used by the browser verification: it mirrors the
// @gpuix/solid universal API shape (host nodes + props) without pulling in the
// native GPU renderer, so the transformed chat.tsx can be executed and its
// output tree compared against the official babel-preset-solid output.

export function createElement(tag) {
  return { kind: "element", tag, props: {}, children: [] };
}

export function createTextNode(value) {
  return { kind: "text", value };
}

export function createComponent(component, props) {
  return component(props);
}

export function insertNode(parent, node) {
  if (node != null) parent.children.push(node);
  return node;
}

export function insert(parent, value, anchor) {
  const resolved = typeof value === "function" ? value() : value;
  if (resolved == null || resolved === false) return anchor;
  if (Array.isArray(resolved)) {
    for (const item of resolved) insert(parent, item, anchor);
    return anchor;
  }
  parent.children.push(resolved);
  return anchor;
}

export function setProp(element, name, value, previous) {
  element.props[name] = value;
  return value;
}

export function spread(element, props, hasChildren) {
  Object.assign(element.props, props);
  return props;
}

export function mergeProps(...sources) {
  return Object.assign({}, ...sources);
}

export function effect(fn) {
  return fn({});
}

export function memo(fn) {
  return fn;
}

export function use(value, element) {
  if (typeof value === "function") value(element);
  return value;
}

const passthrough = (name) => {
  const component = (props) => (props && props.children !== undefined ? props.children : null);
  component.displayName = name;
  return component;
};

export const Button = passthrough("Button");
export const Dialog = passthrough("Dialog");
export const DialogBackdrop = passthrough("DialogBackdrop");
export const DialogClose = passthrough("DialogClose");
export const DialogPopup = passthrough("DialogPopup");
export const DialogPortal = passthrough("DialogPortal");
export const DialogTitle = passthrough("DialogTitle");
export const Select = passthrough("Select");
export const SelectContent = passthrough("SelectContent");
export const SelectLabel = passthrough("SelectLabel");
export const SelectTrigger = passthrough("SelectTrigger");

// SelectItem's children is a render prop receiving the item state
export const SelectItem = (props) => {
  const state = { selected: false, highlighted: false, open: false };
  return typeof props.children === "function" ? props.children(state) : props.children;
};

export const motion = {
  div: passthrough("motion.div"),
  span: passthrough("motion.span"),
};

export function useGpuix() {
  return undefined;
}

export function createWindowInsets() {
  return () => ({ ime: { bottom: 0 } });
}

export function render() {}
