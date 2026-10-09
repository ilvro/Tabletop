// Shared modelling vocabulary; values are metres, not screen-space decoration.
export const box = (size,position,material='wood',rotation,bevel) => ({shape:'box',size,position,material,...(rotation?{rotation}:{}),...(bevel?{bevel:Math.min(bevel,Math.min(...size)*.48)}:{})});
export const cylinder = (radius,height,position,material='metal',radiusTop=radius,rotation) => ({shape:'cylinder',radiusTop,radiusBottom:radius,height,position,material,segments:24,...(rotation?{rotation}:{})});
export const ellipsoid = (size,position,material='cloth',rotation) => ({shape:'ellipsoid',size,position,material,...(rotation?{rotation}:{})});
export const ring = (radius,tube,position,material='metal',rotation) => ({shape:'ring',radius,tube:Math.max(.002,tube),segments:32,sides:8,position,material,...(rotation?{rotation}:{})});
export const turned = (profile,position,material='wood',rotation) => ({shape:'lathe',profile,segments:32,position,material,...(rotation?{rotation}:{})});
export const curve = (points,radius,material='metal',position=[0,0,0]) => ({shape:'rope',points,radius:Math.max(.005,radius),segments:points.length===2?2:points.length<=4?16:32,sides:8,position,material});
export const profile = (contour,depth,position,material='wood',rotation) => ({shape:'profile',contour,depth,position,material,...(rotation?{rotation}:{})});
export const cushion = (size,position,material='cloth',rotation) => ({...box(size,position,material,rotation,Math.min(...size)*.38),cushion:true});
export function frame(w,h,depth,position,material='wood',border=.025) {
  const [x,y,z]=position;
  return [box([w,border,depth],[x,y-h/2+border/2,z],material),box([w,border,depth],[x,y+h/2-border/2,z],material),...[-1,1].map(s=>box([border,h-border*2,depth],[x+s*(w-border)/2,y,z],material))];
}
export function spindle(height,radius,position,material='wood') {
  return turned([[0,0],[radius*.7,0],[radius*.7,height*.08],[radius,height*.11],[radius,height*.17],[radius*.6,height*.2],[radius*.42,height*.45],[radius*.75,height*.63],[radius*.55,height*.72],[radius*.55,height*.91],[radius*.85,height*.94],[radius*.85,height],[0,height]],position,material);
}
export const CRAFT_MATERIALS = {
  wood:{color:'#624631',roughness:.62},dark:{color:'#292827',roughness:.64},metal:{color:'#8f9997',roughness:.33,metalness:.82},
  rust:{color:'#745140',roughness:.9,metalness:.25},cloth:{color:'#5a6a5d',roughness:.96},white:{color:'#d4ceba',roughness:.36},
  stone:{color:'#858075',roughness:.88},black:{color:'#191d20',roughness:.61},red:{color:'#753c36',roughness:.69},paper:{color:'#cbbf9d',roughness:.95},
  screen:{color:'#263f41',emissive:'#254746',emissiveIntensity:.22,roughness:.21},wax:{color:'#d2ba89',roughness:.73},
  flame:{color:'#efc282',emissive:'#ffb65b',emissiveIntensity:.7},violet:{color:'#5e4c77',emissive:'#614379',emissiveIntensity:.24},
  green:{color:'#40583c',roughness:.96},brass:{color:'#a28a54',roughness:.39,metalness:.8},glass:{color:'#293c42',roughness:.13,metalness:.23},
};
