import type { ReactElement, ReactNode } from "@agentclutch/react";

const EVENT_HANDLER = /^on[A-Z]/;

export function renderElement(node: ReactNode): Node {
  if (node === null || node === undefined || typeof node === "boolean") {
    return document.createTextNode("");
  }

  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }

  if (Array.isArray(node)) {
    const fragment = document.createDocumentFragment();
    for (const child of node) {
      fragment.append(renderElement(child));
    }
    return fragment;
  }

  if (typeof node.type === "function") {
    return renderElement(node.type(node.props));
  }

  const element = document.createElement(node.type);
  applyProps(element, node);
  appendChildren(element, node.props.children);
  return element;
}

function applyProps(element: HTMLElement, node: ReactElement): void {
  for (const [key, value] of Object.entries(node.props)) {
    if (key === "children" || value === undefined || value === null) continue;

    if (key === "className") {
      element.setAttribute("class", String(value));
      continue;
    }

    if (key === "htmlFor") {
      element.setAttribute("for", String(value));
      continue;
    }

    if (EVENT_HANDLER.test(key) && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      continue;
    }

    if (typeof value === "boolean") {
      if (value) element.setAttribute(key, "");
      continue;
    }

    element.setAttribute(key, String(value));
  }
}

function appendChildren(element: HTMLElement, children: ReactNode): void {
  if (children === undefined) return;

  if (Array.isArray(children)) {
    for (const child of children) {
      element.append(renderElement(child));
    }
    return;
  }

  element.append(renderElement(children));
}
