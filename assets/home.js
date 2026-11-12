// Home page motion: scroll-linked words, the demo video player,
// gentle parallax on the receipt, and section reveals.
(function(){
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  /* 1. Manifesto: words light up as the paragraph scrolls through */
  var words = [], manifesto = document.querySelector('[data-words]');
  function split(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType === 3){
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(part){
          if(!part) return;
          if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
          words.push(s); frag.appendChild(s);
        });
        n.parentNode.replaceChild(frag, n);
      } else if(n.nodeType === 1){ split(n); }
    });
  }
  if(manifesto && !reduce) split(manifesto);

  /* 2. Product demo video: plays muted while on screen, sound on request, chapter jumps */
  var player = document.getElementById('player'), film = document.getElementById('film');
  var chaps = Array.prototype.slice.call(document.querySelectorAll('#chaps button'));
  var snd = document.getElementById('snd'), pp = document.getElementById('pp'), fs = document.getElementById('fs'), big = document.getElementById('bigplay');
  var userPaused = false, inView = false;
  function play(){ var p = film.play(); if(p && p.catch) p.catch(function(){}); }
  function setSound(on){
    film.muted = !on; snd.setAttribute('aria-pressed', on ? 'true' : 'false');
    snd.querySelector('span').textContent = on ? '🔊' : '🔇';
    snd.querySelector('.t').textContent = on ? 'Sound on' : 'Tap for sound';
  }
  if(player && film){
    setSound(false); snd.querySelector('span').textContent = '🔊';
    film.addEventListener('play', function(){ player.classList.add('playing'); pp.textContent = '❚❚'; pp.setAttribute('aria-label','Pause'); });
    film.addEventListener('pause', function(){ player.classList.remove('playing'); pp.textContent = '▶'; pp.setAttribute('aria-label','Play'); });
    big.addEventListener('click', function(){ userPaused = false; setSound(true); play(); });
    snd.addEventListener('click', function(){ setSound(film.muted); if(film.paused){ userPaused = false; play(); } });
    pp.addEventListener('click', function(){ if(film.paused){ userPaused = false; play(); } else { userPaused = true; film.pause(); } });
    film.addEventListener('click', function(){ pp.click(); });
    fs.addEventListener('click', function(){
      setSound(true); play();
      if(film.requestFullscreen) film.requestFullscreen(); else if(film.webkitEnterFullscreen) film.webkitEnterFullscreen();
    });
    chaps.forEach(function(b){ b.addEventListener('click', function(){ film.currentTime = +b.dataset.t; userPaused = false; play(); }); });
    film.addEventListener('timeupdate', function(){
      var t = film.currentTime;
      chaps.forEach(function(b){
        var s0 = +b.dataset.t, s1 = +b.dataset.end, on = t >= s0 && t < s1;
        b.classList.toggle('on', on);
        b.style.setProperty('--p', on ? ((t - s0) / (s1 - s0)).toFixed(3) : (t >= s1 ? 1 : 0));
      });
    });
    // autoplay (muted) only while the player is mostly on screen, and never for reduced motion
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        inView = entries[0].isIntersecting;
        if(inView && !reduce && !userPaused) play();
        else if(!inView && !film.paused){ film.pause(); }
      }, {threshold: 0.55}).observe(player);
    }
  }

  /* 3. Hero receipt drifts slower than the page */
  var pact = document.querySelector('.pact');

  var ticking = false;
  function onScroll(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      var vh = window.innerHeight, y = window.scrollY;
      if(pact && !reduce && y < vh * 1.2){
        pact.style.setProperty('--py', (y * 0.12).toFixed(1) + 'px');
        pact.style.setProperty('--pr', (y * 0.0025).toFixed(3) + 'deg');
      }
      if(words.length){
        var r = manifesto.getBoundingClientRect();
        var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
        var lit = p * (words.length + 4);
        for(var i = 0; i < words.length; i++) words[i].style.setProperty('--o', clamp(lit - i, 0.14, 1).toFixed(2));
      }
      if(player && !reduce){
        var pr = player.getBoundingClientRect();
        player.style.setProperty('--fs', (0.9 + 0.1 * clamp((vh - pr.top) / (vh * 0.75), 0, 1)).toFixed(4));
      }
    });
  }
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onScroll);
  onScroll();

  /* 4. Privacy compare: drag (or arrow keys) between your view and your crew's view */
  var cmp = document.getElementById('cmp'), range = document.getElementById('cmp-range'), touched = false;
  function setX(v){ cmp.style.setProperty('--x', v + '%'); }
  if(cmp && range){
    // on phones the details column is narrower, so rest further right
    var rest = window.matchMedia('(max-width: 640px)').matches ? 72 : 50;
    setX(rest); range.value = rest;
    range.addEventListener('input', function(){ touched = true; setX(range.value); });
    range.addEventListener('pointerdown', function(){ touched = true; });
    if(!reduce && 'IntersectionObserver' in window){
      var co = new IntersectionObserver(function(entries){
        if(!entries[0].isIntersecting) return;
        co.disconnect();
        // one gentle sweep so people notice it moves, then back to rest
        var keys = [rest, rest - 26, Math.min(rest + 18, 92), rest], t0 = null, dur = 2600;
        function ease(t){ return t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }
        function frame(ts){
          if(touched) return;
          if(t0 === null) t0 = ts;
          var t = clamp((ts - t0) / dur, 0, 1), seg = Math.min(2, Math.floor(t * 3)), lt = ease(t * 3 - seg);
          var v = keys[seg] + (keys[seg + 1] - keys[seg]) * lt;
          setX(v.toFixed(1)); range.value = v;
          if(t < 1) requestAnimationFrame(frame);
        }
        setTimeout(function(){ requestAnimationFrame(frame); }, 500);
      }, {threshold: 0.6});
      co.observe(cmp);
    }
  }

  /* 5. Savings goals: bars fill and numbers count up when they scroll in */
  var goals = document.getElementById('goals');
  if(goals && 'IntersectionObserver' in window){
    var go = new IntersectionObserver(function(entries){
      if(!entries[0].isIntersecting) return;
      go.disconnect(); goals.classList.add('in');
      if(reduce) return;
      goals.querySelectorAll('[data-to]').forEach(function(el){
        var to = +el.dataset.to, rest = el.querySelector('span'), t0 = null;
        function tick(ts){
          if(t0 === null) t0 = ts;
          var t = clamp((ts - t0) / 1400, 0, 1), v = Math.round(to * (1 - Math.pow(1 - t, 3)));
          el.firstChild.nodeValue = '$' + v.toLocaleString('en-US') + ' ';
          if(t < 1) requestAnimationFrame(tick);
        }
        if(rest) requestAnimationFrame(tick);
      });
    }, {threshold: 0.4});
    go.observe(goals);
  } else if(goals){ goals.classList.add('in'); }

  /* 6. Sections ease in once */
  var rv = document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, {rootMargin: '0px 0px -10% 0px', threshold: 0.1});
    rv.forEach(function(el){ ro.observe(el); });
  } else { rv.forEach(function(el){ el.classList.add('in'); }); }
})();
