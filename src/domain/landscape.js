export const VEGETATION_ASSETS=['builtin-alpine-fir','builtin-alpine-pine','builtin-bare-mountain-tree','builtin-alpine-fern','builtin-dry-grass','builtin-dense-alpine-fir','builtin-dense-mountain-pine','builtin-forked-dead-branch','builtin-twisted-mountain-roots','builtin-winter-dry-shrub'];
export const isVegetationAsset=id=>VEGETATION_ASSETS.includes(id);
export const WATER_DEFAULTS=Object.freeze({state:'water',opacity:.72,waveHeight:.08,waveScale:3,speed:.6,direction:0});
export const WATER_RANGES={opacity:[.05,1],waveHeight:[0,.5],waveScale:[.2,50],speed:[0,5],direction:[0,360]};
