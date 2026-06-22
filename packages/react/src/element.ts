export type ReactText = string | number;
export type ReactNode =
  | ReactElement
  | ReactText
  | boolean
  | null
  | undefined
  | ReactNode[];

export type ComponentType<P extends Record<string, unknown> = Record<string, unknown>> = (
  props: P
) => ReactElement | null;

export type ElementType = string | ComponentType<Record<string, unknown>>;

export interface ReactElement<P extends Record<string, unknown> = Record<string, unknown>> {
  $$typeof: symbol;
  type: ElementType;
  key: string | null;
  ref: unknown;
  props: P & {
    children?: ReactNode;
  };
  _owner: null;
}

export function createElement<P extends Record<string, unknown>>(
  type: ElementType,
  props?: P | null,
  ...children: ReactNode[]
): ReactElement<Record<string, unknown>> {
  const nextProps: Record<string, unknown> = { ...(props ?? {}) };
  const key = normalizeKey(nextProps["key"]);

  delete nextProps["key"];
  delete nextProps["ref"];

  if (children.length === 1) {
    nextProps["children"] = children[0];
  } else if (children.length > 1) {
    nextProps["children"] = children;
  }

  return {
    $$typeof: Symbol.for("react.element"),
    type,
    key,
    ref: null,
    props: nextProps,
    _owner: null
  };
}

function normalizeKey(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

export const h = createElement;
