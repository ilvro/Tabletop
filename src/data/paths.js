/** Runtime paths follow the published directory, including project Pages and custom domains. */
export function applicationBaseURL(base = import.meta.env?.BASE_URL ?? './', pageURL = globalThis.location?.href ?? 'http://localhost/') {
  const url = new URL(base, pageURL); url.search = ''; url.hash = ''; return url;
}
export const applicationURL = path => new URL(path.replace(/^\//,''),applicationBaseURL()).href;
export function resolveAssetURL(url, base = applicationBaseURL()) {
  if (typeof url !== 'string') return url;
  // Catalog paths are canonical, rooted at the application, not the hosting domain.
  return /^\/(assets\/|api\/tabletop\/)/.test(url) ? new URL(url.slice(1),base).href : url;
}
export const resolveAsset = asset => ({...asset,url:resolveAssetURL(asset.url),...(asset.previewUrl?{previewUrl:resolveAssetURL(asset.previewUrl)}:{})});
export const storageScope = () => applicationBaseURL().pathname;
