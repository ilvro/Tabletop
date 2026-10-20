// Open the sidebar tab and expand the task/disclosure a user would open before operating its control.
export async function reveal(node) {
  if (!await node.waitFor({ state: 'attached', timeout: 1500 }).then(() => true, () => false)) {
    const page = node.page();
    for (const tab of ['scene', 'shots', 'elements', 'build']) { const button = page.locator(`.tabs [data-tab="${tab}"]`); if (!await button.count()) continue; await button.click(); if (await node.count()) break; }
  }
  await node.evaluate(element => {
    // The inspector tab that holds the control comes first; its disclosures open after.
    const pane = element.closest('[data-inspector-tab]');
    if (pane?.hidden) document.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();
    const parents = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS' && !parent.open) parents.push(parent);
    for (const details of parents.reverse()) details.querySelector(':scope > summary').click();
  });
  return node;
}
