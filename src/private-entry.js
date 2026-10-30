// The private server authenticates both this bundle and every saved-life request.
try {
  const response=await fetch('/api/resident',{cache:'no-store'});
  if(response.status===401){location.replace('/');}
  else if(!response.ok)throw Error('Private server unavailable');
  else {
    window.portoResident=await response.json();
    // The persistent resident belongs to Porto Sol, independent of old world links.
    if(location.search)history.replaceState(null,'',location.pathname);
    await import('./main.js');
  }
} catch(error) {
  console.error(error);
  document.querySelector('#app').textContent='Start the private server with npm start, then open http://localhost:8788. Your saved life will resume there.';
}
