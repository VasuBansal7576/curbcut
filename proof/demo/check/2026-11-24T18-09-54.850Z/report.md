# Accessibility repair for 127.0.0.1

**Page** http://127.0.0.1:4317/fixtures/shop/

**Patch** keyboard-add-headphones

## Barrier

Field Headphones Add to cart control is an unfocusable div.add-to-cart (tabIndex -1, role text) so it is outside sequential Tab order and cannot be activated with keyboard

## Relevant WCAG criteria

- 2.1.1 Keyboard
- 4.1.2 Name, Role, Value
- 2.4.7 Focus Visible

## Who it blocks

- People who navigate with a keyboard or keyboard emulation
- People who use assistive technology to identify controls
- People who need to see where keyboard focus is

## Source change

Set this attribute on the element matching div.add-to-cart.

```html
tabindex="0"
```

Set this attribute on the element matching div.add-to-cart.

```html
role="button"
```

Use native button or link markup for this activation behavior.

```json
{
  "action": "bindEnterToClick",
  "selector": "div.add-to-cart"
}
```

```diff
+ :is(div.add-to-cart):focus-visible {
+   outline: 3px solid Highlight;
+   outline-offset: 3px;
+ }
```

Set this attribute on the element matching #search.

```html
aria-label="Search"
```

## Verification

Local proof (Chromium measurement).
