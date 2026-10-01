export function mapProjection(view,player,width,height){
  const scale=1.13*view.zoom*Math.min(width/356,height/344);
  const follow=Math.min(1,(view.zoom-1)*2);
  const center=view.center??{x:(26/1.13)*(1-follow)+player.x*follow,z:(-1/1.13)*(1-follow)+player.z*follow};
  return {scale,center,ox:width/2-center.x*scale,oz:height/2-center.z*scale};
}
export function panMap(view,player,width,height,dx,dy){
  const {scale,center}=mapProjection(view,player,width,height);
  view.center={x:Math.max(-180,Math.min(180,center.x-dx/scale)),z:Math.max(-200,Math.min(180,center.z-dy/scale))};
}
export function zoomMap(view,player,width,height,zoom,anchor){
  const before=mapProjection(view,player,width,height);
  view.zoom=Math.max(1,Math.min(6,zoom));
  if(anchor){
    const scale=mapProjection(view,player,width,height).scale;
    view.center={x:(anchor.x-before.ox)/before.scale-(anchor.x-width/2)/scale,z:(anchor.y-before.oz)/before.scale-(anchor.y-height/2)/scale};
  }
}
