// Home page motion: scroll-linked words, sticky story steps, gentle parallax, section reveals.
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 901px)');
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  /* 1. Manifesto: split into words that light up as the paragraph scrolls through */
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

  /* 2. Hero receipt drifts slower than the page */
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
        for(var i = 0; i < words.length; i++){
          words[i].style.setProperty('--o', clamp(lit - i, 0.14, 1).toFixed(2));
        }
      }
    });
  }
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', onScroll);
  onScroll();

  /* 3. Story: the step in the middle of the screen drives the sticky card */
  var feed = document.getElementById('feed');
  var steps = document.querySelectorAll('.st');
  var layers = document.querySelectorAll('.layer');
  function setStep(n){
    for(var k = 1; k <= 4; k++) feed.classList.toggle('s' + k, k <= n);
    layers.forEach(function(l){
      var i = +l.dataset.layer;
      l.classList.toggle('on', i === n);
      l.classList.toggle('past', i < n);
    });
    steps.forEach(function(s){ s.classList.toggle('on', +s.dataset.step === n); });
  }
  if(feed && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      if(!wide.matches) return;
      entries.forEach(function(e){ if(e.isIntersecting) setStep(+e.target.dataset.step); });
    }, {rootMargin: '-45% 0px -45% 0px'});
    steps.forEach(function(s){ io.observe(s); });
    function mode(){
      if(wide.matches){ setStep(1); }
      else { // narrow screens: no sticky card, show everything as of today
        layers.forEach(function(l){ l.classList.remove('on', 'past'); });
        feed.classList.add('s1', 's2', 's3'); feed.classList.remove('s4');
      }
    }
    mode();
    if(wide.addEventListener) wide.addEventListener('change', mode);
  }

  /* 4. Sections ease in once */
  var rv = document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, {rootMargin: '0px 0px -10% 0px', threshold: 0.1});
    rv.forEach(function(el){ ro.observe(el); });
  } else { rv.forEach(function(el){ el.classList.add('in'); }); }
})();
