const categoryEmoji={cafes:'☕',coworking:'💻',yoga:'🧘',restaurants:'🍽️'};
const emojiFor=category=>category.split(',').map(c=>categoryEmoji[c]).join('');
const statusEl=document.querySelector('#status');
const locateBtn=document.querySelector('#locate');

function loadMaps(){return new Promise((resolve,reject)=>{window.__mapsReady=resolve;const s=document.createElement('script');s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.MAPS_CONFIG.apiKey)}&callback=__mapsReady&libraries=marker&v=weekly`;s.async=true;s.onerror=reject;document.head.appendChild(s);});}
function markerNode(emoji,category,label,extra=''){
  const kind=category.includes(',')?'multi':category;
  const shell=document.createElement('div');shell.className=`marker-shell ${extra}`;
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
    const marker=new google.maps.marker.AdvancedMarkerElement({map,position:{lat:place.lat,lng:place.lng},title:place.name,content:markerNode(emojiFor(place.category),place.category,place.name),collisionBehavior:google.maps.CollisionBehavior.REQUIRED});
    bounds.extend(marker.position);
    marker.addListener('click',()=>{info.setContent(`<div class="info"><h3>${emojiFor(place.category)} ${escapeHtml(place.name)}</h3><p>⭐ ${place.rating} · ${place.reviews.toLocaleString()} reviews</p><p>🚶 ${place.walk_min} min from the shared location</p><a href="${place.maps_url}" target="_blank" rel="noopener">Open in Google Maps</a></div>`);info.open({map,anchor:marker});});
  }
  bounds.extend(places.origin);map.fitBounds(bounds,70);statusEl.textContent=`${places.items.length} recommendations`;
  function locate(){
    if(!navigator.geolocation){statusEl.textContent='Location is unavailable';return;}
    statusEl.textContent='Finding your location…';
    navigator.geolocation.getCurrentPosition(pos=>{const here={lat:pos.coords.latitude,lng:pos.coords.longitude};new google.maps.marker.AdvancedMarkerElement({map,position:here,title:'My location',content:markerNode('●','me','You are here','me'),zIndex:100});bounds.extend(here);map.fitBounds(bounds,70);statusEl.textContent=`${places.items.length} recommendations · location shown`;},()=>{statusEl.textContent='Location permission was not granted';},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  locateBtn.addEventListener('click',locate);locate();
}
main().catch(err=>{console.error(err);statusEl.textContent='Map failed to load';});
