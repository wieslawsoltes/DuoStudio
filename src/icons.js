/* Original vector interface and app-icon interpretations. Brand names identify the studies. */
(function(D){
'use strict';
const paths={
 home:'M3 11 12 3l9 8v10h-6v-7H9v7H3Z', grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 search:'M10.7 18a7.3 7.3 0 1 0 0-14.6 7.3 7.3 0 0 0 0 14.6Zm5.4-2L22 22', close:'m6 6 12 12M6 18 18 6', plus:'M12 4v16M4 12h16',
 chevron:'m9 5 7 7-7 7', back:'m15 5-7 7 7 7', down:'m5 9 7 7 7-7', up:'m5 15 7-7 7 7',
 send:'m3 3 19 9-19 9 4-9-4-9Zm4 9h15', arrow:'M12 20V4m-7 7 7-7 7 7',
 heart:'M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z',
 comment:'M21 11.5a8.5 8.5 0 0 1-9 8.5H4l-3 2 1.8-5A8.7 8.7 0 0 1 3 5.5a9.5 9.5 0 0 1 18 6Z', bookmark:'M6 3h12v19l-6-4-6 4V3Z',
 share:'M8 8 12 3l4 5M12 3v12M7 11H4v10h16V11h-3', link:'m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 check:'m4 12 5 5L20 6', check2:'m2 12 5 5L18 6M12 17l9-11', more:'M4 12h.01M12 12h.01M20 12h.01', menu:'M4 6h16M4 12h16M4 18h16',
 play:'m8 4 13 8-13 8V4Z', pause:'M8 4v16M16 4v16', next:'m5 4 12 8-12 8V4ZM20 4v16', prev:'m19 4-12 8 12 8V4ZM4 4v16', volume:'M11 4 6 8H2v8h4l5 4V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14', mute:'M11 4 6 8H2v8h4l5 4V4Zm5 5 6 6m-6 0 6-6',
 mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-4 6v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8',
 camera:'M3 7h4l2-3h6l2 3h4v14H3V7ZM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z', video:'M3 5h12v14H3V5Zm12 5 6-4v12l-6-4',
 phone:'M5 3 2 6c1 8 8 15 16 16l3-3-5-5-3 2a15 15 0 0 1-6-6l2-3-4-4Z',
 mail:'M3 5h18v14H3V5Zm0 0 9 8 9-8', inbox:'M5 3h14l3 12v6H2v-6L5 3ZM2 15h6l2 3h4l2-3h6', archive:'M4 8h16v13H4V8ZM2 3h20v5H2V3Zm7 9h6', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 edit:'m16 3 5 5-13 13H3v-5L16 3Zm-2 2 5 5', file:'M5 2h9l5 5v15H5V2Zm9 0v6h5M8 13h8M8 17h6', copy:'M8 8h13v13H8V8ZM16 8V3H3v13h5', download:'M12 3v13m-5-5 5 5 5-5M3 17v4h18v-4', upload:'M12 16V3m-5 5 5-5 5 5M3 17v4h18v-4',
 pin:'M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13ZM15 9a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z', navigate:'m21 3-7 18-3-8-8-3L21 3Z', layers:'m12 2 11 6-11 6L1 8l11-6ZM2 12l10 6 10-6M2 16l10 6 10-6', route:'M5 3v13a4 4 0 0 0 8 0V8a4 4 0 0 1 8 0v13M2 6l3-3 3 3m10 12 3 3 3-3',
 sun:'M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2', moon:'M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z',
 settings:'m10 2 4 0 1 3 3 2 3-1 2 4-2 2v3l2 2-2 4-3-1-3 2-1 3h-4l-1-3-3-2-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-2 1-2ZM16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z',
 split:'M2 4h20v16H2V4Zm10 0v16', rotate:'M3 10a9 9 0 0 1 16-5l2 3M21 3v5h-5M21 14A9 9 0 0 1 5 19l-2-3M3 21v-5h5', fold:'M3 4h8v16H3V4Zm10 0 8-2v18l-8-2V4Z', fullscreen:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',
 lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4V10Zm8 5v3', bell:'M4 17h16l-2-4V8A6 6 0 0 0 6 8v5l-2 4Zm5 3a3 3 0 0 0 6 0', wifi:'M2 7a16 16 0 0 1 20 0M5 11a11 11 0 0 1 14 0M8 15a6 6 0 0 1 8 0M12 19h.01',
 battery:'M2 6h17v12H2V6Zm20 4v4M5 9h11v6H5V9Z', clock:'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM12 6v6l4 3',
 spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z', globe:'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
 user:'M17 7a5 5 0 1 0-10 0 5 5 0 0 0 10 0ZM3 22v-3a9 9 0 0 1 18 0v3', users:'M15 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 21v-2a8 8 0 0 1 16 0v2M17 3a4 4 0 0 1 0 8M20 14a5 5 0 0 1 3 5v2',
 star:'m12 2 3 6.5 7 1-5 5 1 7-6-3.5L6 22l1-7-5-5 7-1L12 2Z', smile:'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM8 14c2 4 6 4 8 0M8 8h.01M16 8h.01',
 attach:'m21 11-9 9a6 6 0 0 1-8-8L15 1a4 4 0 0 1 6 6L10 18a2 2 0 0 1-3-3l10-10', image:'M3 3h18v18H3V3Zm0 14 6-6 4 4 3-3 5 5M9 7h.01',
 undo:'M8 3 3 8l5 5M3 8h11a7 7 0 0 1 0 14', refresh:'M21 7V2l-3 3A9 9 0 0 0 3 11M3 17v5l3-3a9 9 0 0 0 15-6M21 7h-5M3 17h5',
 code:'m8 5-7 7 7 7m8-14 7 7-7 7m-3-16-2 18', book:'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16',
 coffee:'M4 7h12v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7Zm12 1h3a3 3 0 0 1 0 6h-3M6 2v2M11 2v2',
 walk:'M14 4h.01M12 7l-3 6 4 3-1 6M12 8l4 4h4M8 22l3-7M9 9l-4 3', bike:'M9 16a5 5 0 1 0-10 0 5 5 0 0 0 10 0ZM25 16a5 5 0 1 0-10 0 5 5 0 0 0 10 0ZM4 16 10 6l6 10H4Zm6-10H7m10-3h3v4l-4 9',
 car:'M3 10 5 3h14l2 7M2 10h20v9H2v-9Zm2 9v3M20 19v3M6 14h2M16 14h2', filter:'M3 5h18M6 12h12M9 19h6', info:'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM12 11v6M12 7h.01',
 palette:'M12 3a9 9 0 0 0 0 18c2 0 3-1 2-3-1-2 1-3 3-2 3 1 4-1 4-4a9 9 0 0 0-9-9ZM7 8h.01M12 6h.01M17 9h.01M6 13h.01',
 list:'M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01', swap:'M3 7h18l-4-4M21 17H3l4 4', keyboard:'M2 5h20v14H2V5ZM5 9h.01M9 9h.01M13 9h.01M17 9h.01M5 13h.01M9 13h.01M13 13h.01M17 13h.01M7 16h10',
};
D.icon=(name,size=20,cls='')=>`<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
let brandSequence=0;
D.brand=(id,size=56)=>{
 const instance=++brandSequence;
 let body='',bg='#fff';
 switch(id){
 case 'chatgpt':bg='#f7f8fa';body=`<g transform="translate(32 32)" fill="none" stroke="#111817" stroke-width="3.1">${Array.from({length:6},(_,i)=>`<path transform="rotate(${i*60})" d="M0-5v-12c0-7 10-12 16-7 7 5 8 13 3 19L7 1"/>`).join('')}</g>`;break;
 case 'threads':bg='#0b0b0b';body='<path d="M45 22c-2-9-8-13-15-12-11 0-17 8-17 22s6 23 19 23c10 0 18-6 18-15 0-8-6-13-15-14-8-1-14 3-14 9s5 10 10 9c7-1 10-9 8-17-1-7-4-10-9-10-4 0-7 2-9 5" fill="none" stroke="white" stroke-width="4.1" stroke-linecap="round"/>';break;
 case 'google':body='<path fill="#4285f4" d="M55 33c0-2 0-4-1-6H32v10h13c-1 4-3 6-6 8v8c9-4 16-11 16-20Z"/><path fill="#34a853" d="M32 56c6 0 12-2 16-6l-9-5c-2 1-4 2-7 2-7 0-13-5-15-11H7v8c5 7 14 12 25 12Z"/><path fill="#fbbc05" d="M17 36c-1-3-1-6 0-9V19H7C3 27 3 37 7 44Z"/><path fill="#ea4335" d="M32 17c4 0 7 1 10 4l8-8c-5-4-11-7-18-7C21 6 12 12 7 19l10 8c2-6 8-10 15-10Z"/>';break;
 case 'tiktok':bg='#08090c';body='<path d="M35 13v26c0 13-19 16-20 3-1-9 7-13 13-10" stroke="#25f4ee" transform="translate(-2 1)" fill="none" stroke-width="8"/><path d="M35 13c0 9 7 14 15 14M35 13v26c0 13-19 16-20 3-1-9 7-13 13-10" stroke="#fe2c55" transform="translate(2 1)" fill="none" stroke-width="7"/><path d="M35 12c0 9 7 14 15 14M35 12v26c0 13-19 16-20 3-1-9 7-13 13-10" stroke="white" fill="none" stroke-width="7"/>';break;
 case 'whatsapp':bg='#26d467';body='<path d="M50 32A18 18 0 0 1 23 48l-12 4 4-12a18 18 0 1 1 35-8Z" fill="none" stroke="white" stroke-width="3.3"/><path d="m24 21-5 3c1 10 8 17 18 20l5-5-7-5-3 3c-4-2-6-4-8-8l3-2-3-6Z" fill="white"/>';break;
 case 'instagram':bg='url(#ig-gradient)';body='<defs><radialGradient id="ig-gradient" cx="25%" cy="100%" r="110%"><stop stop-color="#ffd776"/><stop offset=".3" stop-color="#f78325"/><stop offset=".6" stop-color="#e82e7e"/><stop offset="1" stop-color="#584bca"/></radialGradient></defs><rect x="13" y="13" width="38" height="38" rx="12" stroke="white" stroke-width="4" fill="none"/><circle cx="32" cy="32" r="9" stroke="white" stroke-width="4" fill="none"/><circle cx="44" cy="20" r="2.8" fill="white"/>';break;
 case 'youtube':body='<rect x="7" y="16" width="50" height="34" rx="11" fill="#ff0033"/><path d="m27 24 14 9-14 8Z" fill="white"/>';break;
 case 'maps':body='<path d="M33 56C25 46 15 34 15 23a18 18 0 1 1 36 0c0 11-10 24-18 33Z" fill="#4285f4"/><path d="M19 11 45 39c-5 7-9 13-12 17-4-5-8-10-12-16Z" fill="#34a853"/><path d="m18 13 9 10-9 10c-5-8-4-14 0-20Z" fill="#fbbc04"/><path d="M19 11a18 18 0 0 1 27 1L33 25Z" fill="#ea4335"/><circle cx="33" cy="23" r="7" fill="white"/>';break;
 case 'gmail':body='<path d="M9 19v30h9V27l14 11 14-11v22h9V19L32 36Z" fill="#4285f4"/><path d="M9 19v30h9V27Z" fill="#4285f4"/><path d="M46 27v22h9V19Z" fill="#34a853"/><path d="m9 19 9-6 14 11 14-11 9 6-23 19Z" fill="#ea4335"/><path d="M9 19v11l9 7V13Z" fill="#c5221f"/><path d="m46 13 9 6v11l-9 7Z" fill="#fbbc04"/>';break;
 case 'gemini':body='<defs><linearGradient id="gem-gradient" x2="1" y2="1"><stop stop-color="#5e91f7"/><stop offset=".5" stop-color="#6a59d7"/><stop offset="1" stop-color="#d784b8"/></linearGradient></defs><path d="M32 6c4 16 11 22 26 26-15 4-22 11-26 26C28 43 21 36 6 32 21 28 28 21 32 6Z" fill="url(#gem-gradient)"/>';break;
 default: body='<path d="M17 32h30M32 17v30" stroke="#fff" stroke-width="4"/>';bg='#7887a8';
 }
 body=body.replaceAll("ig-gradient","ig-gradient-"+instance).replaceAll("gem-gradient","gem-gradient-"+instance);bg=bg.replaceAll("ig-gradient","ig-gradient-"+instance);
 return `<svg class="brand-icon" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="${bg}"/>${body}</svg>`;
};
})(window.Duo=window.Duo||{});
