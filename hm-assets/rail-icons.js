/* Replaces rail emoji with clean line-icons that match each system.
   Matches on each .rail .i's tooltip text, uses currentColor so it themes. */
(function(){
  var S='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';
  var E='</svg>';
  var I={
    user:S+'<circle cx="12" cy="8" r="3.2"/><path d="M5.6 19c0-3.4 2.9-5.8 6.4-5.8S18.4 15.6 18.4 19"/>'+E,
    heart:S+'<path d="M12 20s-6.8-4.4-6.8-9.4A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 6.8 3C18.8 15.6 12 20 12 20z"/>'+E,
    lungs:S+'<path d="M12 4v6"/><path d="M10 8.5C9 8 8 8.6 7.4 10 6.4 12 6 14.4 6.6 17c.3 1.4 1.4 2 2.6 1.6 1-.3 1.4-1.2 1.4-2.4V9.5"/><path d="M14 8.5c1-.5 2 .1 2.6 1.5 1 2 1.4 4.4.8 7-.3 1.4-1.4 2-2.6 1.6-1-.3-1.4-1.2-1.4-2.4V9.5"/>'+E,
    brain:S+'<path d="M12 5.5v13"/><path d="M12 6.5C11.4 5 10 4.4 8.6 5S6.8 7 7.4 8.2C6 8.4 5 9.6 5.2 11c.2 1.2 1.2 2 2.4 2M9 16.4c-1.4.3-2.7-.6-2.9-2"/><path d="M12 6.5C12.6 5 14 4.4 15.4 5s1.8 2 1.2 3.2c1.4.2 2.4 1.4 2.2 2.8-.2 1.2-1.2 2-2.4 2M15 16.4c1.4.3 2.7-.6 2.9-2"/>'+E,
    bone:S+'<path d="M8.5 8.5l7 7"/><path d="M8.5 8.5a2 2 0 1 0-2.4-2.4A2 2 0 1 0 8.5 8.5z"/><path d="M15.5 15.5a2 2 0 1 0 2.4 2.4 2 2 0 1 0-2.4-2.4z"/>'+E,
    gland:S+'<path d="M12 7.5v9"/><path d="M12 8.5C10.8 6.6 8.6 6 7.2 7.2 5.8 8.4 6 10.8 8 12.4c1.6 1.2 3.6.6 4-1.4"/><path d="M12 8.5c1.2-1.9 3.4-2.5 4.8-1.3 1.4 1.2 1.2 3.6-.8 5.2-1.6 1.2-3.6.6-4-1.4"/>'+E,
    gut:S+'<path d="M8 4.5c2.4 0 2.4 2.3 0 2.3S5.6 9 8 9s2.4 2.3 0 2.3S5.6 13.5 8 13.5s3 2.3 3 2.3 0 3.7 4 3.7"/>'+E,
    nerve:S+'<path d="M13 3l-7 9.5h5l-1 8.5 7-10h-5l1-8z"/>'+E,
    lab:S+'<path d="M9.5 3h5"/><path d="M10.5 3v5.5L6.4 16.6A2 2 0 0 0 8.2 19.6h7.6a2 2 0 0 0 1.8-3L13.5 8.5V3"/><path d="M8.4 14h7.2"/>'+E,
    pill:S+'<path d="M6.7 13.4l6.7-6.7a3.3 3.3 0 0 1 4.7 4.7l-6.7 6.7a3.3 3.3 0 0 1-4.7-4.7z"/><path d="M10 10l4 4"/>'+E,
    cal:S+'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/>'+E,
    chat:S+'<path d="M20 11.8a7 7 0 0 1-10 6.2L4.5 19.5 6 14.3A7 7 0 1 1 20 11.8z"/>'+E,
    gear:S+'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M4.4 12h2M17.6 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/>'+E,
    help:S+'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="16.4" r=".7" fill="currentColor" stroke="none"/>'+E,
    flame:S+'<path d="M12 3.5c1 3-2 4-2 6.8a2 2 0 0 0 4 0c0-.8.4-1.4.9-1.9 1 1.9 2 2.9 2 4.9a5 5 0 0 1-10 0c0-3.8 4-5.6 5.1-9.8z"/>'+E
  };
  function pick(t){t=(t||'').toLowerCase();
    if(/overview|dashboard/.test(t))return I.user;
    if(/cardio|heart|circulat/.test(t))return I.heart;
    if(/respirat|lung/.test(t))return I.lungs;
    if(/neuro|brain|mood|focus/.test(t))return I.brain;
    if(/musculo|skelet|bone/.test(t))return I.bone;
    if(/endocrine|hormone|thyroid/.test(t))return I.gland;
    if(/gut|gi|digest/.test(t))return I.gut;
    if(/nervous/.test(t))return I.nerve;
    if(/metabol/.test(t))return I.flame;
    if(/lab|result/.test(t))return I.lab;
    if(/medication|pill|pharm/.test(t))return I.pill;
    if(/appoint|calendar/.test(t))return I.cal;
    if(/message/.test(t))return I.chat;
    if(/help/.test(t))return I.help;
    if(/setting/.test(t))return I.gear;
    return null;
  }
  document.querySelectorAll('.rail .i').forEach(function(el){
    var tip=el.querySelector('.tip');
    var svg=pick(tip?tip.textContent:'');
    if(!svg)return;
    Array.prototype.slice.call(el.childNodes).forEach(function(n){if(n.nodeType===3)el.removeChild(n);});
    el.insertAdjacentHTML('afterbegin',svg);
  });
})();
