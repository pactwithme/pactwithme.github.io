// Early-access email forms: any <form data-signup> on the page.
// Sends sign-ups to the Google Apps Script web app set in assets/config.js,
// which appends them to the team's Google Sheet.
(function(){
  var RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var ENDPOINT=(window.PACT_SIGNUP_URL||'').trim();
  function source(){
    try{ var p=new URLSearchParams(location.search);
      return p.get('src')||p.get('utm_source')||p.get('ref')||(document.referrer?new URL(document.referrer).hostname:'direct');
    }catch(e){ return 'direct'; }
  }
  document.querySelectorAll('form[data-signup]').forEach(function(form){
    var input=form.querySelector('input[type=email]'), btn=form.querySelector('button'),
        msg=form.parentNode.querySelector('.form-msg'), hp=form.querySelector('input[name=website]'),
        label=btn.textContent;
    function say(t,kind){ if(msg){ msg.textContent=t; msg.className='form-msg '+(kind||''); } }
    input.addEventListener('input',function(){ input.classList.remove('bad'); say(''); });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=input.value.trim();
      if(!RE.test(email)){ input.classList.add('bad'); input.focus(); return say('Please enter a valid email address.','err'); }
      if(!ENDPOINT){ return say('Sign-ups aren’t switched on yet. Please check back soon.','err'); }
      btn.disabled=true; btn.textContent='Joining…';
      // text/plain keeps this a "simple" request, so the browser skips the
      // CORS preflight that Apps Script can't answer.
      fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({email:email,source:source(),page:location.pathname,website:hp?hp.value:''})})
      .then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
      .then(function(d){
        if(!d.ok) throw new Error(d.error||'Something went wrong. Please try again.');
        form.hidden=true;
        say(d.duplicate?"You're already on the list. Thanks for coming back!":"You're on the list. We'll email you when Pact is ready.",'ok');
        if(msg){ msg.setAttribute('tabindex','-1'); msg.focus(); }
      })
      .catch(function(err){
        btn.disabled=false; btn.textContent=label;
        say(err.message==='Failed to fetch'?'We couldn’t connect. Check your internet and try again.':err.message,'err');
      });
    });
  });
})();
