// Home page motion: scroll-linked words, the group chat that plays as you scroll,
// gentle parallax on the receipt, and section reveals.
(function(){
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Only this script turns on scroll mode, so a stale or failed script never hides the chat.
  var scrolly = !reduce;
  if(scrolly) root.classList.add('scrolly');
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

  /* 2. The group chat: scroll position decides how many messages have arrived */
  var story = document.querySelector('.story');
  var msgs = story ? Array.prototype.slice.call(story.querySelectorAll('.m')) : [];
  var chapters = story ? story.querySelectorAll('.ch') : [];
  var dots = story ? story.querySelectorAll('.ch-dots i') : [];
  var typing = document.getElementById('typing');
  var typingAv = typing && typing.querySelector('.av');
  var streak = story && story.querySelector('.streak');
  var streakText = {1:'Starts Mon', 2:'Day 1 of 7', 3:'Day 2 of 7', 4:'Week done ✓'};
  var NAMES = {a1:'A', a2:'R', a3:'K', a4:'Y'};
  var shown = -1, chapter = 0;
  if(story && scrolly) story.style.setProperty('--n', Math.round(msgs.length * 0.8));

  function setChapter(c){
    if(c === chapter) return; chapter = c;
    chapters.forEach(function(el){ el.classList.toggle('on', +el.dataset.ch === c); });
    dots.forEach(function(el){ el.classList.toggle('on', +el.dataset.ch <= c); });
    if(streak) streak.textContent = streakText[c];
  }
  function updateChat(vh){
    var r = story.getBoundingClientRect();
    var span = Math.max(1, r.height - vh);
    var p = clamp(-r.top / span, 0, 1);
    var exact = 1 + p * (msgs.length - 1) * 1.04;      // first message is there from the start
    var count = clamp(Math.floor(exact), 1, msgs.length);
    if(count !== shown){
      shown = count;
      msgs.forEach(function(m, i){ m.classList.toggle('show', i < count); });
      setChapter(+msgs[count - 1].dataset.ch);
    }
    // someone is typing when the next message is theirs and it's about to land
    var next = msgs[count];
    var who = next && next.dataset.who;
    var on = !!who && (exact - Math.floor(exact)) > 0.35 && count < msgs.length;
    if(typing){
      typing.classList.toggle('on', on);
      if(on){ typingAv.className = 'av ' + who; typingAv.textContent = NAMES[who]; }
    }
  }
  if(!scrolly && chapters.length) chapters[0].classList.add('on');

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
      if(story && scrolly) updateChat(vh);
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
