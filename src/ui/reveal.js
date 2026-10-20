/** Bring a control into reach: its inspector tab and every enclosing disclosure. The side tab is the caller's job. */
export function revealNode(node, { scroll = true } = {}) {
  const pane = node.closest('[data-inspector-tab]');
  if (pane?.hidden) node.ownerDocument.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();
  for (let parent = node.parentElement; parent; parent = parent.parentElement)
    if (parent.tagName === 'DETAILS' && !parent.open) parent.querySelector(':scope > summary')?.click();
  if (scroll) node.scrollIntoView({ block: 'center' });
}
