// Expand the same task/disclosure a user would open before operating its control.
export async function reveal(node) {
  await node.evaluate(element => {
    const parents = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS' && !parent.open) parents.push(parent);
    for (const details of parents.reverse()) details.querySelector(':scope > summary').click();
  });
  return node;
}
