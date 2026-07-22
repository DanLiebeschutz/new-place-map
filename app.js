const categoryEmoji={cafes:'☕',coworking:'💻',yoga:'🧘',restaurants:'🍽️'};
const emojiFor=category=>category.split(',').map(c=>categoryEmoji[c]).join('');
const statusEl=document.querySelector('#status');
const locateBtn=document.querySelector('#locate');

function loadMaps(){return new Promise((resolve,reject)=>{window.__mapsReady=resolve;const s=document.createElement('script');s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.MAPS_CONFIG.apiKey)}&callback=__mapsReady&libraries=marker&v=weekly`;s.async=true;s.onerror=reject;document.head.appendChild(s);});}
function markerNode(emoji,category,label,side='right',extra=''){
  const kind=category.includes(',')?'multi':category;
  const shell=document.createElement('div');shell.className=`marker-shell label-${side} ${extra}`;
  const pin=document.createElement('div');pin.className=`marker-pin marker-${kind}`;pin.textContent=emoji;
  const name=document.createElement('div');name.className='marker-label';name.textContent=label;
  shell.append(pin,name);return shell;
}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function main(){
  const [places]=await Promise.all([fetch('places.json').then(r=>r.json()),loadMaps()]);
  const map=new google.maps.Map(document.querySelector('#map'),{center:places.origin,zoom:15,mapId:window.MAPS_CONFIG.mapId,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,tilt:0,heading:0});
  const bounds=new google.maps.LatLngBounds();
  const info=new google.maps.InfoWindow();
  for(const place of places.items){
    const side=place.lng<places.origin.lng?'left':'right';
    const marker=new google.maps.marker.AdvancedMarkerElement({map,position:{lat:place.lat,lng:place.lng},title:place.name,content:markerNode(emojiFor(place.category),place.category,place.name,side),collisionBehavior:google.maps.CollisionBehavior.REQUIRED,zIndex:Math.min(place.reviews,9999)});
    bounds.extend(marker.position);
    marker.addListener('click',()=>{info.setContent(`<div class="info"><h3>${emojiFor(place.category)} ${escapeHtml(place.name)}</h3><p>⭐ ${place.rating} · ${place.reviews.toLocaleString()} reviews</p><p>🚶 ${place.walk_min} min from the shared location</p><a href="${place.maps_url}" target="_blank" rel="noopener">Open in Google Maps</a></div>`);info.open({map,anchor:marker});});
  }
  bounds.extend(places.origin);map.fitBounds(bounds,70);google.maps.event.addListenerOnce(map,'idle',()=>map.setZoom(Math.min((map.getZoom()||15)+1,17)));statusEl.textContent=`${places.items.length} recommendations`;
  let locationMarker=null;
  function showLocation(pos){
    const here={lat:pos.coords.latitude,lng:pos.coords.longitude};
    if(locationMarker) locationMarker.position=here;
    else locationMarker=new google.maps.marker.AdvancedMarkerElement({map,position:here,title:'My location',content:markerNode('●','me','You are here','right','me'),zIndex:10000});
    map.panTo(here);map.setZoom(Math.max(map.getZoom()||15,16));
    statusEl.textContent=`${places.items.length} recommendations · location shown`;
    locateBtn.textContent='📍 Center on me';locateBtn.disabled=false;
  }
  function locate(){
    if(locationMarker){map.panTo(locationMarker.position);return;}
    if(!navigator.geolocation){statusEl.textContent='Location is unavailable in this browser';return;}
    statusEl.textContent='Finding your location…';
    locateBtn.disabled=true;
    navigator.geolocation.getCurrentPosition(showLocation,error=>{
      const messages={1:'Location access is blocked. Allow it in the browser site settings.',2:'Your location is temporarily unavailable.',3:'Location request timed out. Tap again to retry.'};
      statusEl.textContent=messages[error.code]||'Could not get your location. Tap again to retry.';
      locateBtn.disabled=false;
    },{enableHighAccuracy:false,timeout:20000,maximumAge:300000});
  }
  locateBtn.addEventListener('click',locate);
  statusEl.textContent=`${places.items.length} recommendations · tap location to show yourself`;
}
main().catch(err=>{console.error(err);statusEl.textContent='Map failed to load';});
