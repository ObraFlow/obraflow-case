/** Called after validation state renders so associated inline feedback is discoverable. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus());
}
