// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){
    log.history = log.history || [];
    log.history.push(arguments);
    if(this.console) {
        var args = arguments, newarr;
        args.callee = args.callee.caller;
        newarr = [].slice.call(args);
        if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);
    }
};

// make it safe to use console.log always
(function(a){
    function b(){}
    for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){
        a[d]=a[d]||b;
    }
})
(function(){
    try{
        console.log();
        return window.console;
    }catch(a){
        return (window.console={});
    }
}());


// place any jQuery/helper plugins in here, instead of separate, slower script files.
(function($){
    $.fn.andain = function( options ) {
        var isPaused = false;  //is the automatic image switching paused?
        var settings   = $.extend({
            'bg'                : $('#bg'),                 //the container 
            'bgImg'             : $('#bgImg'),              //the actual fullscreen image being shown
            'preloadContainer'  : $('#preloader'),          //the contianer for the next image to be shown
            'thumbContainer'    : $('#thumbsContainer'),    //the container which holds the thumbnails
            'thumbOpenButton'   : $('#thumbsSlide'),        //the clickable button for open/close of the thumbContainer
            'thumbOpenButtonIMG': $('#thumbsSlide img'),    //the child image (arrow indicator) which we will flip on open/close
            'navContainer'      : $('#nav'),                //the container which holds the navigation options
            'preloadImg'        : $('#preloadImg'),         //the container which holds the next image to be drawn (prelaods it, yo!)
            'transitionTime'    : 'slow',                   //how long should the transition take
            'slideShowLoop'     : undefined,                //this will hold the setTimeout so we can start/stop it whenever required
            'slideShowNextImg'  : undefined,                //what is the next image we are going to draw?
            'imageHoldTime'     : 7000,                     //how long will we wait befor drawNextImage();
            'thumbnails'        : $("#thumbsContainer a.thumb_link")   //all of the thumbnails
        }, options );
        
        
        function init(){
            //bind some events to watch for
            $(window).bind('resize', function(){
                fullScreenBackground();
            });
            settings.thumbOpenButton.bind('click', function(){
                slidePanels();
            });
            $('a.thumb_link').bind('click', function(e){
                e.preventDefault();
                switchToImage($(this));
            });
            $('#nav .play').bind('click', function(){
                if(isPaused){
                    isPaused = false;
                    startSlideShow(true);
                }else{
                    isPaused = true;
                    stopSlideShow();
                }
            });
            $('#nav .prev').bind('click', function(){
                stopSlideShow();
                slideShowPrev(true); //will start the slideshow again for you.
            });
            $('#nav .next').bind('click', function(){
                stopSlideShow();
                slideShowNext(); //will start the slideshow again for you.
            });
            $(document).bind('keyup', function(e){
                switch (e.keyCode){
                    case 27:
                        if(isPaused){
                            isPaused = false;
                            startSlideShow(true);
                        }else{
                            isPaused = true;
                            stopSlideShow();
                        }
                        break;
                    case 37:
                        stopSlideShow();
                        slideShowPrev(true); //will start the slideshow again for you.
                        break;
                    case 39:
                        stopSlideShow();
                        slideShowNext(); //will start the slideshow again for you.
                        break;
                    default:
                        console.log('keyCode: ' + e.keyCode);
                        break;
                }
            })
            
            //setup our image and close our thumbnail view
            fullScreenBackground();
            slidePanels();
            startSlideShow();
        }
        
        //logic borrowed from SIDEWAYS plugin @ http://manos.malihu.gr/sideways-jquery-fullscreen-image-gallery
        function fullScreenBackground(){
            var winWidth=$(window).width();
            var winHeight=$(window).height();
            var imageWidth=$(settings.bgImg).width();
            var imageHeight=$(settings.bgImg).height();
            
            $(settings.bgImg).removeClass("with_border").removeClass("with_shadow"); //remove extra styles of orininal view mode
            var picHeight = imageHeight / imageWidth;
            var picWidth = imageWidth / imageHeight;
            
            if ((winHeight / winWidth) < picHeight) {
                $(settings.bgImg).css("width",winWidth).css("height",picHeight*winWidth);
            } else {
                $(settings.bgImg).css("height",winHeight).css("width",picWidth*winHeight);
            };
            
            //center it
            $(settings.bgImg).css("margin-left",((winWidth - $(settings.bgImg).width())/2)).css("margin-top",((winHeight - $(settings.bgImg).height())/2));
        
        }
        
        //logic borrowed from SIDEWAYS plugin @ http://manos.malihu.gr/sideways-jquery-fullscreen-image-gallery
        function slidePanels(){
            var speed=900;
            var easing="easeInOutExpo";
            if(settings.thumbOpenButtonIMG.hasClass('flipX')){
                settings.thumbContainer.stop().animate({
                    left: 0
                }, speed,easing,function(){
                    settings.thumbOpenButtonIMG.removeClass('flipX');
                });
            } else {
                settings.thumbContainer.stop().animate({
                    left: -570
                }, speed,easing, function(){
                    settings.thumbOpenButtonIMG.addClass('flipX');
                });
            }
        }
        
        function slideShowPrev(noPreload){
            src = undefined;
            settings.thumbnails.each(function(i){
                if($(this).hasClass('activeImg')){
                    $(this).removeClass('activeImg');
                    if(i == 0){
                        src = settings.thumbnails.eq(settings.thumbnails.length-1).attr('href');
                        settings.thumbnails.eq(settings.thumbnails.length-1).addClass('activeImg');
                    }else{
                        src = settings.thumbnails.eq( (i-1) ).attr('href');
                        settings.thumbnails.eq( (i-1) ).addClass('activeImg');
                    }
                    return false;
                }  
            });
            settings.preloadImg.attr('src', src);
            settings.slideShowNextImg = src;
            slideShowNext(noPreload);  //start the countdown to the next image switch
        }
        
        function slideShowNext(noPreload){
            //fade out the current img, fade in the preloaded one
            settings.bgImg.fadeOut(1000, function(){
                $(this).attr('src',settings.slideShowNextImg).fadeIn();
            });
            startSlideShow(noPreload);  //start the countdown to the next image switch
        }
        
        //why make the users wait for loading images? that sucks right?! ;)
        function preloadImage(){
            //find the thumbnail index move to next() and cache!
            src = undefined;
            settings.thumbnails.each(function(i){
                if($(this).hasClass('activeImg')){
                    src = settings.thumbnails.eq(i).attr('href');
                    settings.thumbnails.eq(i).addClass('activeImg');
                    settings.preloadImg.attr('src', src);
                    settings.slideShowNextImg = src;
                    return false;
                }
            });
        }
            
        function preloadNextImage(){
            //find the thumbnail index move to next() and cache!
            src = undefined;
            settings.thumbnails.each(function(i){
                if($(this).hasClass('activeImg')){
                    $(this).removeClass('activeImg');
                    if(i == (settings.thumbnails.length-1)){
                        src = settings.thumbnails.eq(0).attr('href');
                        settings.thumbnails.eq(0).addClass('activeImg');
                    }else{
                        src = settings.thumbnails.eq( (i+1) ).attr('href');
                        settings.thumbnails.eq( (i+1) ).addClass('activeImg');
                    }
                    return false;
                }  
            });

            if(src == undefined){ //likely our first run or something horribly wrong
                settings.thumbnails.eq(0).addClass('activeImg');
                src = settings.thumbnails.eq(0).attr('href');
            }
            
            settings.preloadImg.attr('src', src);
            settings.slideShowNextImg = src;
        }
        
        //noPreload, if true will not preload the next image
        //this is useful for the case of an end-user clicking a thumbnail as we
        //want to load their clicked image, not preload and render the next one!
        function startSlideShow(noPreload){
            if( noPreload != true) preloadNextImage();
            settings.navContainer.children('.play').attr('src','/img/pause.png')
            settings.slideShowLoop = setTimeout(function(){
                slideShowNext();
            }, settings.imageHoldTime)
        }
        
        function stopSlideShow(){ 
            clearTimeout(settings.slideShowLoop);
            settings.navContainer.children('.play').attr('src','/img/play.png');
        }
        
        //This is mainly for if a user clicks on a thumbnail, we want to switch to that
        //image immediately.
        function switchToImage(elem){
            settings.thumbnails.removeClass('activeImg');
            elem.addClass('activeImg');
            stopSlideShow();
            preloadImage();
            slideShowNext(true); //will start the slideshow again for you.
        }
        
        init();
    }
})( jQuery );

$(window).load(function() {
    $().andain();
});