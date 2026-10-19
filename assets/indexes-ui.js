(function(){
  var FAVORITES_KEY='indexes_favorites_v1';
  // Keep the direct WhatsApp enquiry and discount display on the selected variant.
  function syncProduct(root) {
    if (!root) return;
    var select = root.querySelector('[data-ix-variant-select]');
    var option = select && select.selectedOptions[0];
    var quantityInput = root.querySelector('[data-ix-qty-input]');
    var quantity = Number(quantityInput && quantityInput.value);
    var link = root.querySelector('.ix-product-whatsapp');
    if (!link) return;
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      return;
    }
    var variantId = root.querySelector('[data-ix-variant-id]').value;
    var title = option ? option.dataset.title : root.dataset.ixVariant;
    var price = option ? option.dataset.price : root.dataset.ixPrice;
    var url = new URL(root.dataset.ixUrl);
    url.searchParams.set('variant', variantId);
    var d = root.dataset;
    var message = [d.ixGreeting + ' ' + d.ixTitle,
      d.ixVariantLabel + ': ' + title,
      d.ixQuantityLabel + ': ' + quantity,
      d.ixPriceLabel + ': ' + price,
      d.ixCurrencyLabel + ': ' + d.productCurrency,
      d.ixLinkLabel + ': ' + url.href, d.ixConfirmation].join(' | ');
    link.href = 'https://wa.me/967771370740?text=' + encodeURIComponent(message);
    link.removeAttribute('aria-disabled');
    if (option) {
      var amount = Number(option.dataset.rawPrice);
      var compare = Number(option.dataset.compare);
      var validSale = Number.isFinite(amount) && amount > 0 && Number.isFinite(compare) && compare > amount;
      var percent = validSale ? Math.round((compare - amount) * 100 / compare) : 0;
      var oldPrice = root.querySelector('[data-ix-compare-price]');
      if (oldPrice) {
        oldPrice.hidden = !validSale;
        oldPrice.textContent = validSale ? option.dataset.compareFormatted : '';
      }
      root.querySelectorAll('[data-ix-sale-label],[data-ix-sale-badge]').forEach(function(badge) {
        badge.hidden = !validSale || percent === 0 || badge.dataset.hasNew === 'true';
        badge.textContent = d.ixSaleTemplate.replace('__PERCENT__', String(percent));
      });
    }
  }

  document.addEventListener('input', function(event) {
    if (event.target.matches('[data-ix-qty-input]')) syncProduct(event.target.closest('[data-ix-product]'));
  });
  document.addEventListener('click', function(event) {
    var link = event.target.closest('.ix-product-whatsapp');
    if (link && link.closest('[data-ix-product]')) {
      syncProduct(link.closest('[data-ix-product]'));
      if (!link.hasAttribute('href')) {
        event.preventDefault();
        link.closest('[data-ix-product]').querySelector('[data-ix-qty-input]').reportValidity();
      }
    }
    var cartLink = event.target.closest('.ix-cart-whatsapp');
    var form = cartLink && cartLink.closest('.ix-cart-form');
    if (form && Array.from(form.querySelectorAll('input[name="updates[]"]')).some(function(input) { return input.value !== input.defaultValue; })) {
      event.preventDefault();
      form.requestSubmit(form.querySelector('[name="update"]'));
    }
  });


  function readFavorites(){
    try{
      var value=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(e){return []}
  }

  function writeFavorites(items){
    try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(items))}catch(e){}
  }

  function refreshFavorites(){
    var items=readFavorites();
    document.querySelectorAll('[data-ix-favorite]').forEach(function(button){
      var active=items.indexOf(button.getAttribute('data-ix-favorite'))>-1;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  document.addEventListener('click',function(event){
    var menu=event.target.closest('[data-ix-menu]');
    if(menu){
      var header=menu.closest('.ix-shell,.ix-home-header');
      var nav=header&&header.querySelector('[data-ix-quicknav]');
      if(nav){
        var open=nav.classList.toggle('is-open');
        menu.setAttribute('aria-expanded',open?'true':'false');
      }
      return;
    }

    var favorite=event.target.closest('[data-ix-favorite]');
    if(favorite){
      var handle=favorite.getAttribute('data-ix-favorite');
      var items=readFavorites();
      var index=items.indexOf(handle);
      if(index>-1){items.splice(index,1)}else{items.push(handle)}
      writeFavorites(items);
      refreshFavorites();
      document.dispatchEvent(new CustomEvent('indexes:favorites-changed',{detail:{items:items}}));
      return;
    }

    var thumb=event.target.closest('[data-ix-gallery-thumb]');
    if(thumb){
      var gallery=thumb.closest('[data-ix-gallery]');
      if(!gallery)return;

      var index=thumb.getAttribute('data-index');
      var slides=gallery.querySelectorAll('[data-ix-gallery-slide]');
      if(slides.length){
        slides.forEach(function(slide){
          var active=slide.getAttribute('data-index')===index;
          slide.hidden=!active;
          slide.classList.toggle('is-active',active);

          if(!active){
            slide.querySelectorAll('video').forEach(function(video){
              try{video.pause()}catch(e){}
            });
            slide.querySelectorAll('iframe').forEach(function(frame){
              try{
                frame.contentWindow&&frame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}','*');
              }catch(e){}
            });
          }
        });
      }else{
        var main=gallery.querySelector('[data-ix-gallery-main]');
        if(main){
          main.src=thumb.getAttribute('data-src');
          main.alt=thumb.getAttribute('data-alt')||'';
        }
      }

      gallery.querySelectorAll('[data-ix-gallery-thumb]').forEach(function(el){
        el.classList.toggle('is-active',el===thumb);
      });
    }
  });

  document.addEventListener('change',function(event){
    var select=event.target.closest('[data-ix-variant-select]');
    if(!select)return;
    var option=select.options[select.selectedIndex];
    var root=select.closest('[data-ix-product]');
    var input=root&&root.querySelector('[data-ix-variant-id]');
    var price=root&&root.querySelector('[data-ix-product-price]');
    var add=root&&root.querySelector('[data-ix-add-product]');
    if(input)input.value=option.value;
    if(price&&option.dataset.price)price.textContent=option.dataset.price;
    syncProduct(root);
    if(add){
      var priced=Number(option.dataset.rawPrice)>0;
      var available=option.dataset.available==='true' && priced;
      add.disabled=!available;
      add.textContent=!priced?'استفسر عن السعر عبر واتساب':(available?'أضف إلى السلة':'غير متوفر');
    }
  });

  document.addEventListener('submit',function(event){
    var root=event.target.closest('[data-ix-product]');
    if(!root || !event.target.matches('.ix-product-actions'))return;
    var select=root.querySelector('[data-ix-variant-select]');
    var option=select && select.selectedOptions[0];
    var amount=Number(option?option.dataset.rawPrice:root.dataset.ixRawPrice);
    if(!Number.isFinite(amount) || amount<=0)event.preventDefault();
  });

  document.addEventListener('DOMContentLoaded',refreshFavorites);
  refreshFavorites();
})();

/* IX_EXT_V2 */
(function(){
  function readFavorites(){
    try{
      var value=JSON.parse(localStorage.getItem('indexes_favorites_v1')||'[]');
      return Array.isArray(value)?value:[];
    }catch(e){return []}
  }

  function formatMoney(cents,currency){
    try{
      return new Intl.NumberFormat('ar-YE',{style:'currency',currency:currency||'YER',maximumFractionDigits:0}).format((Number(cents)||0)/100);
    }catch(e){
      return ((Number(cents)||0)/100).toFixed(0)+' '+(currency||'YER');
    }
  }

  function renderWishlist(){
    var root=document.querySelector('[data-ix-wishlist-list]');
    if(!root)return;
    var items=readFavorites();
    root.innerHTML='';
    if(!items.length){
      var empty=document.createElement('p');
      empty.className='ix-empty-state';
      empty.textContent='لا توجد منتجات محفوظة في المفضلة على هذا الجهاز.';
      root.appendChild(empty);
      return;
    }
    var currency=root.getAttribute('data-currency')||'YER';
    Promise.all(items.map(function(handle){
      return fetch('/products/'+encodeURIComponent(handle)+'.js',{credentials:'same-origin'})
        .then(function(res){if(!res.ok)throw new Error('not found');return res.json()})
        .then(function(product){return {ok:true,handle:handle,product:product}})
        .catch(function(){return {ok:false,handle:handle}})
    })).then(function(results){
      root.innerHTML='';
      var rendered=0;
      results.forEach(function(result){
        if(!result.ok)return;
        rendered++;
        var p=result.product;
        var card=document.createElement('article');
        card.className='ix-wishlist-card';

        var link=document.createElement('a');
        link.href=p.url||('/products/'+result.handle);

        var img=document.createElement('img');
        var featured=p.featured_image;
        img.src=typeof featured==='string'?featured:(featured&&featured.src?featured.src:'');
        img.alt=p.title||'منتج';
        img.loading='lazy';
        link.appendChild(img);

        var body=document.createElement('div');
        body.className='ix-wishlist-card__body';

        var title=document.createElement('a');
        title.href=link.href;
        title.textContent=p.title||result.handle;

        var price=document.createElement('strong');
        price.textContent=Number(p.price)>0?formatMoney(p.price,currency):'استفسر عن السعر';

        var remove=document.createElement('button');
        remove.type='button';
        remove.setAttribute('data-ix-favorite',result.handle);
        remove.setAttribute('aria-pressed','true');
        remove.textContent='إزالة من المفضلة';

        body.appendChild(title);
        body.appendChild(price);
        body.appendChild(remove);
        card.appendChild(link);
        card.appendChild(body);
        root.appendChild(card);
      });
      if(!rendered){
        var empty=document.createElement('p');
        empty.className='ix-empty-state';
        empty.textContent='تعذر تحميل المنتجات المحفوظة.';
        root.appendChild(empty);
      }
    });
  }

  document.addEventListener('click',function(event){
    var minus=event.target.closest('[data-ix-qty-minus]');
    var plus=event.target.closest('[data-ix-qty-plus]');
    if(minus||plus){
      var root=(minus||plus).closest('.ix-quantity__control');
      var input=root&&root.querySelector('[data-ix-qty-input]');
      if(input){
        var value=Math.max(1,parseInt(input.value||'1',10)||1);
        input.value=minus?Math.max(1,value-1):value+1;
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }
      return;
    }

    var sortButton=event.target.closest('[data-ix-sort]');
    if(sortButton){
      var form=sortButton.closest('form');
      var select=form&&form.querySelector('select[name="sort_by"]');
      if(select){
        select.value=sortButton.getAttribute('data-ix-sort');
        form.submit();
      }
      return;
    }

    var share=event.target.closest('[data-ix-share]');
    if(share){
      var url=share.getAttribute('data-ix-share')||location.href;
      if(navigator.share){
        navigator.share({url:url}).catch(function(){});
      }else if(navigator.clipboard){
        navigator.clipboard.writeText(url).catch(function(){});
      }
    }
  });

  document.addEventListener('indexes:favorites-changed',renderWishlist);
  document.addEventListener('DOMContentLoaded',renderWishlist);
  renderWishlist();
})();

/* IX_DRAWER_SQUEEZE_FIX_V1 */
(function(){
  function clearDrawerSqueeze(){
    var wrapper=document.querySelector('.page-wrapper');
    if(!wrapper)return;
    if(wrapper.classList.contains('page-wrapper--drawer-open')){
      wrapper.classList.remove('page-wrapper--drawer-open');
    }
    wrapper.style.removeProperty('margin-right');
    wrapper.style.removeProperty('margin-left');
    wrapper.style.removeProperty('transform');
  }

  function watchDrawerSqueeze(){
    clearDrawerSqueeze();
    var wrapper=document.querySelector('.page-wrapper');
    if(!wrapper)return;
    var observer=new MutationObserver(function(){
      clearDrawerSqueeze();
    });
    observer.observe(wrapper,{attributes:true,attributeFilter:['class','style']});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',watchDrawerSqueeze,{once:true});
  }else{
    watchDrawerSqueeze();
  }
})();

/* IX_MOTION_SYSTEM_V1 */
(function(){
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealSelector=[
    '.ix-hero',
    '.ix-categories-section',
    '.ix-featured',
    '.ix-promo-card',
    '.ix-trust-strip',
    '.ix-page__title',
    '.ix-collection-hero',
    '.ix-collection-card',
    '.ix-product-card',
    '.ix-product-layout',
    '.ix-gallery',
    '.ix-product-info',
    '.ix-cart-item',
    '.ix-cart-summary',
    '.ix-order-form',
    '.ix-offers-hero',
    '.ix-about-intro',
    '.ix-about-benefits article',
    '.ix-contact-card',
    '.ix-contact-form',
    '.ix-account-profile',
    '.ix-account-menu',
    '.ix-account-guest',
    '.ix-wishlist-card'
  ].join(',');

  var revealObserver=null;

  function bindReveal(root){
    var nodes=[];
    if(root&&root.nodeType===1&&root.matches&&root.matches(revealSelector))nodes.push(root);
    if(root&&root.querySelectorAll){
      root.querySelectorAll(revealSelector).forEach(function(node){nodes.push(node)});
    }
    nodes.forEach(function(node,index){
      if(node.dataset.ixMotionBound==='1')return;
      node.dataset.ixMotionBound='1';
      if(reduced){
        node.classList.add('is-visible');
        return;
      }
      node.classList.add('ix-motion-item');
      node.style.setProperty('--ix-motion-delay',Math.min((index%6)*55,275)+'ms');
      if(revealObserver)revealObserver.observe(node);
      else node.classList.add('is-visible');
    });
  }

  function initReveal(){
    if(reduced||!('IntersectionObserver'in window)){
      bindReveal(document);
      document.querySelectorAll('.ix-motion-item').forEach(function(node){node.classList.add('is-visible')});
      return;
    }
    revealObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },{threshold:.08,rootMargin:'0px 0px -5% 0px'});
    bindReveal(document);

    var mutations=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType===1)bindReveal(node);
        });
      });
    });
    mutations.observe(document.body,{childList:true,subtree:true});
  }

  function initHeroRotation(){
    if(reduced)return;
    document.querySelectorAll('.ix-hero').forEach(function(hero){
      var items=Array.prototype.slice.call(hero.querySelectorAll('.ix-hero__product'));
      var dots=Array.prototype.slice.call(hero.querySelectorAll('.ix-hero__dots i'));
      if(items.length<2)return;

      var index=0;
      var timer=null;
      var touchStartX=null;

      function setActive(next){
        index=(next+items.length)%items.length;
        items.forEach(function(item,i){item.classList.toggle('is-ix-active',i===index)});
        dots.forEach(function(dot,i){dot.classList.toggle('is-active',i===index)});
      }
      function stop(){
        if(timer){clearInterval(timer);timer=null}
      }
      function start(){
        stop();
        timer=setInterval(function(){setActive(index+1)},3200);
      }
      function pauseThenResume(){
        stop();
        setTimeout(function(){
          if(!document.hidden)start();
        },4200);
      }

      setActive(0);
      start();

      hero.addEventListener('pointerenter',stop);
      hero.addEventListener('pointerleave',start);
      hero.addEventListener('touchstart',function(event){
        touchStartX=event.touches&&event.touches[0]?event.touches[0].clientX:null;
      },{passive:true});
      hero.addEventListener('touchend',function(event){
        if(touchStartX===null)return;
        var endX=event.changedTouches&&event.changedTouches[0]?event.changedTouches[0].clientX:touchStartX;
        var delta=endX-touchStartX;
        touchStartX=null;
        if(Math.abs(delta)>34){
          setActive(index+(delta<0?1:-1));
          pauseThenResume();
        }
      },{passive:true});

      document.addEventListener('visibilitychange',function(){
        if(document.hidden)stop();else start();
      });
    });
  }

  function initScrollState(){
    var headers=Array.prototype.slice.call(document.querySelectorAll('.ix-home-header,.ix-shell'));
    if(!headers.length)return;
    var ticking=false;
    function update(){
      var scrolled=(window.scrollY||document.documentElement.scrollTop||0)>10;
      headers.forEach(function(header){header.classList.toggle('is-scrolled',scrolled)});
      ticking=false;
    }
    window.addEventListener('scroll',function(){
      if(!ticking){
        ticking=true;
        requestAnimationFrame(update);
      }
    },{passive:true});
    update();
  }

  function initTapFeedback(){
    document.addEventListener('click',function(event){
      var nav=event.target.closest('.ix-mobile-nav a');
      if(nav){
        nav.classList.remove('is-ix-tapped');
        void nav.offsetWidth;
        nav.classList.add('is-ix-tapped');
        setTimeout(function(){nav.classList.remove('is-ix-tapped')},460);
      }
    });
  }

  function initMotion(){
    initReveal();
    initHeroRotation();
    initScrollState();
    initTapFeedback();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initMotion,{once:true});
  }else{
    initMotion();
  }
})();
var IX_MOTION_SYSTEM_V1=true;
(function(){
  var root=document.documentElement;
  if(root.hasAttribute('data-ix-motion-bound'))return;
  root.setAttribute('data-ix-motion-bound','true');

  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){
    root.classList.add('ix-motion-reduced');
    return;
  }

  root.classList.add('ix-motion-ready');

  var selector=[
    '.ix-section__heading',
    '.ix-category-card',
    '.ix-product-card',
    '.ix-promo-card',
    '.ix-trust-strip > span',
    '.ix-page > *',
    '.ix-product-layout > *',
    '.ix-cart-item',
    '.ix-cart-summary',
    '.ix-order-form',
    '.ix-account-profile',
    '.ix-account-menu',
    '.ix-wishlist-card',
    '.ix-collection-card',
    '.ix-collection-hero',
    '.ix-collection-tools'
  ].join(',');

  var observer='IntersectionObserver' in window?new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.12,rootMargin:'0px 0px -5% 0px'}):null;

  function bindReveal(scope){
    var base=scope&&scope.querySelectorAll?scope:document;
    base.querySelectorAll(selector).forEach(function(el,index){
      if(el.hasAttribute('data-ix-reveal'))return;
      el.setAttribute('data-ix-reveal','');
      el.style.setProperty('--ix-reveal-delay',Math.min(index%6,5)*55+'ms');
      var rect=el.getBoundingClientRect();
      if(!observer||rect.top<window.innerHeight*0.9){
        el.classList.add('is-visible');
      }else{
        observer.observe(el);
      }
    });
  }

  function updateHeader(){
    var scrolled=window.scrollY>12;
    document.querySelectorAll('.ix-shell,.ix-home-header').forEach(function(header){
      header.classList.toggle('ix-is-scrolled',scrolled);
    });
  }

  var ticking=false;
  window.addEventListener('scroll',function(){
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(function(){
      updateHeader();
      ticking=false;
    });
  },{passive:true});

  document.addEventListener('visibilitychange',function(){
    document.body&&document.body.classList.toggle('ix-motion-paused',document.hidden);
  });

  document.addEventListener('shopify:section:load',function(event){
    bindReveal(event.target||document);
  });

  document.addEventListener('indexes:favorites-changed',function(){
    document.querySelectorAll('.ix-favorite.is-active').forEach(function(el){
      el.classList.remove('ix-pop');
      void el.offsetWidth;
      el.classList.add('ix-pop');
    });
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      bindReveal(document);
      updateHeader();
    },{once:true});
  }else{
    bindReveal(document);
    updateHeader();
  }

  window.addEventListener('load',function(){bindReveal(document)},{once:true});
})();

