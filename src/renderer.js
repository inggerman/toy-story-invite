// Dynamic positioning + real‑time attendance counter by counting attendees length
window.addEventListener('load', () => {
    // ---------- DOM refs ----------
    const img = document.querySelector('.background-image');
    const card = document.querySelector('.card');
    const confirmBtn = document.getElementById('confirmBtn');
    const confirmCountEl = document.getElementById('confirmCount');
    const calendarBtn = document.getElementById('calendarBtn');
    const mapBtn = document.getElementById('mapBtn');
    const whatsappBtn = document.getElementById('whatsappBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const bgMusic = document.getElementById('bgMusic');
  
    // ---------- Card positioning ----------
    function updateCard() {
      const W = img.clientWidth;
      const H = img.clientHeight;
      const orig = { x: 263, y: 240, w: 490, h: 600 };
      Object.assign(card.style, {
        left: `${(orig.x / 1015) * W}px`,
        top: `${(orig.y / 1079) * H}px`,
        width: `${(orig.w / 1015) * W}px`,
        height: `${(orig.h / 1079) * H}px`
      });
    }
    img.complete ? updateCard() : img.addEventListener('load', updateCard);
    window.addEventListener('resize', updateCard);
  
    // ---------- Audio controls ----------
    playPauseBtn.addEventListener('click', () => bgMusic.paused ? bgMusic.play() : bgMusic.pause());
    muteBtn.addEventListener('click', () => { bgMusic.muted = !bgMusic.muted; });
  
    // ---------- Firebase Realtime Database ----------
    let db = null;
    try { db = firebase.database(); } catch (e) {
      console.error('Firebase init error. Falling back to local only.', e);
    }
  
    /** Extra identifiers */
    let userIP = 'unknown';
    // Fetch public IP (non‑blocking)
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => { userIP = d.ip; }).catch(()=>{});
    const userUA = navigator.userAgent;
  
    // Unique device id (per browser)
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', deviceId);
    }
    const localKey = `confirmed_${deviceId}`;
  
    // Helper to disable button UI
    const disableBtn = () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '¡Asistencia confirmada!';
    };
  
    if (db) {
      /* -------------------- ONLINE MODE -------------------- */
      const attendeesRef = db.ref('attendees');
      const deviceRef = attendeesRef.child(deviceId);
  
      // 1) Live counter – just count children length
      attendeesRef.on('value', snap => {
        const count = snap.exists() ? snap.numChildren() : 0;
        confirmCountEl.textContent = `Asistencias confirmadas: ${count}`;
        localStorage.setItem('globalConfirmCount', count); // cache for offline
      });
  
      // 2) Disable button if already confirmed (device node exists)
      deviceRef.once('value').then(snap => { if (snap.exists()) disableBtn(); });
  
      // 3) Confirm button handler
      confirmBtn.addEventListener('click', () => {
        if (confirmBtn.disabled) return;
  
        // Ensure we have fetched IP (or fallback to unknown)
        deviceRef.transaction(current => {
          if (current) return; // already exists
          return {
            ts: firebase.database.ServerValue.TIMESTAMP,
            ip: userIP,
            ua: userUA,
            deviceId: deviceId
          };
        }).then(res => {
          if (res.committed) {
            disableBtn();
            alert('¡Gracias por confirmar tu asistencia!');
          } else {
            disableBtn();
          }
        }).catch(err => {
          console.error('Firebase write failed, switching offline', err);
          fallbackLocal();
        });
      });
    } else {
      /* -------------------- OFFLINE MODE -------------------- */
      fallbackLocal();
    }
  
    function fallbackLocal() {
      // Load cached global count or 0
      const cached = parseInt(localStorage.getItem('globalConfirmCount') || '0', 10);
      confirmCountEl.textContent = `Asistencias confirmadas: ${cached}`;
  
      if (localStorage.getItem(localKey) === 'true') { disableBtn(); return; }
  
      confirmBtn.addEventListener('click', () => {
        if (confirmBtn.disabled) return;
        localStorage.setItem(localKey, 'true');
        const newTotal = cached + 1;
        localStorage.setItem('globalConfirmCount', newTotal);
        confirmCountEl.textContent = `Asistencias confirmadas: ${newTotal}`;
        disableBtn();
        alert('¡Gracias por confirmar tu asistencia! (modo offline)');
      }, { once: true });
    }
  
    calendarBtn.addEventListener('click', () => {
        try {
          openGoogleCalendar(); // primero intenta abrir Google Calendar
        } catch (e) {
          downloadICS(); // si falla, descarga .ics
        }
      });
      
    mapBtn.addEventListener('click', () => window.open('https://maps.app.goo.gl/PMh236nWYhjdWSTA8', '_blank'));
    whatsappBtn.addEventListener('click', () => {
      const txt = encodeURIComponent('¡Estás invitado a la fiesta Toy Story de Elián! 🎉 Más info: https://tuinvitacion.com');
      window.open(`https://wa.me/?text=${txt}`, '_blank');
    });
  });

 
  function openGoogleCalendar() {
    const title = "Fiesta Toy Story – Elián cumple 3 años";
    const location = "Salón Los Faroles, Huamantla, Tlaxcala";
    const description = "Ven a celebrar con nosotros en una fiesta temática Toy Story 🎉🎂";
    const start = "20250830T170000";
    const end = "20250830T200000";
  
    const url = `https://www.google.com/calendar/render?action=TEMPLATE` +
                `&text=${encodeURIComponent(title)}` +
                `&dates=${start}/${end}` +
                `&location=${encodeURIComponent(location)}` +
                `&details=${encodeURIComponent(description)}`;
  
    window.open(url, '_blank');
  }
  
  function downloadICS() {
    const icsContent = `
  BEGIN:VCALENDAR
  VERSION:2.0
  CALSCALE:GREGORIAN
  BEGIN:VEVENT
  SUMMARY:Fiesta Toy Story – Elián cumple 3 años
  DESCRIPTION:Ven a celebrar con nosotros en una fiesta temática Toy Story 🎉🎂
  LOCATION:Salón Los Faroles, Huamantla, Tlaxcala
  DTSTART:20250830T170000
  DTEND:20250830T200000
  RRULE:FREQ=DAILY;COUNT=3
  BEGIN:VALARM
  TRIGGER:-P2D
  DESCRIPTION:Recordatorio - Fiesta Toy Story
  ACTION:DISPLAY
  END:VALARM
  END:VEVENT
  END:VCALENDAR`.trim();
  
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "toy-story-fiesta.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  