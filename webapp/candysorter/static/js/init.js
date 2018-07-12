$(function () {
    /**
     Bugs
     1. Mic icon shows between intepreted text and translated text
     2. Text is placed off-center in similarities after  navigating back from cam if done rapidly

     Missing
     - Loading animations where work is actually done, not just for show. But maybe both..?
     - Text/UI/layout from sketch prototype
     - Test everything
     - Cam: candy-outlines
     - Hints don't show after returning to idle mic screen
     - Learning mode link is a part of hints. It should be moved, if included at all
     - Maybe a reset button to nav to first state
     */

    // API settings
    var pid = Math.floor(Math.random() * 10000000000000000); // POST ID
    var morUrl = "/api/morphs"; // API for Morphological analysis
    var simUrl = "/api/similarities"; // API for Similarity analysis
    var pickUrl = "/api/pickup"; // API for pick up candy
    var tranUrl = "/api/translate"; // API for translation
    var simSec = 5000; // delay time
    var simNoWaitNum = 5;
    var plotSec = 5000; // display time of scatter plot(milisec）
    var camSec = 7000; // display tiem of camera image(milisec)

    // Navigation settings
    var checkFreq=200; //How often should we check whether enough time has passed considering the maximum duration.
    var waitKey=32; //What key should prevent automatic forwards navigation. here 32: Space
    var backKey=37;//What key navigates "backwards": <-
    var forwardKey=39;//What key navigates "forwards": ->
    var navDebounceDur =250;//Minimum time spent in new state before forwards navigation is possible.
    var askEnabled = 1;//Ask if they liked the candy. Takes priority to askInThankYouScreen
    var askInThankYouScreen = 1;//Ask if they liked the candy in the thank you screen

    // Other settings
    var debug=true; //Print out to console when true, with the print() function
    var speechLang = "no"; //spoken language setting
    var lang = "en"; // language setting
    var examples = ["\"Kan jeg få sjokolade?\"","\"Jeg liker smurf\"","\"Kan jeg få lakris?\"", "\"Kan jeg få noe søtt?\""];

    //Nl helper variables
    var morXHR = null;
    var simXHR = null;

    // Helper variables
    var hintTimeoutId;
    var hintCounter = 0;
    var hintIntervalId;
    var noFunction = function(){};
    var recognition;
    var inputSpeech = "Kan jeg få en smurf";
    var speechTxt = "";
    var sim = "";
    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var tranTimeoutId;    
    var morphLoadTimeoutId;    
    var morphData;    
    var simTimeoutId;
    var latesSmilaritiesAjaxData;

    // Helper nav variables
    var funcToCancelRunningFunc;
    var checkerTimeout;
    var forwardNavFunc;
    var backwardNavFunc;
    var keepCheckingDurNav=false;
    var maxWaitDurTime;
    var previousNavTime=0;


    var initIdleMic = function () {
        print("startIdleMic");
        setNavigation(hideIdleMic, noFunction, showInterepretedSpeech); //Vi gir tom function siden en ikke trenger aa gaa tilbake
        showIdleMic();
        hintTimeoutId= setTimeout(initHints, 10000);
    }

    var showIdleMic = function (){
        print("showIdleMic");
        $("body").addClass("mode-speech-start");
        $(".speech-mic").click(recordSpeech);
    }

    var hideIdleMic = function (){
        print("hideIdleMic");
        $(".speech-footer").hide();
        $(".speech-hand-animation").hide(); //Hide demo animation when record starts
        stopShowingHints();
    }

    var initHints = function () { 
        print("initHints");
        hintCounter = 0;
        $("#example-text").text(examples[hintCounter++]); // initialize with first quote
        hintIntervalId=setInterval(showHints, 8500);
        showHints();
    }

    var showHints = function() { //TODO synes ikke etter rec->tilbake
        print("showHints");
        if (hintCounter >= examples.length) { hintCounter = 0; }
        $(".speech-footer").show();
        $("#example-text").fadeIn();
        $(".speech-hand-animation").hide();
        $("#example-text").fadeOut(2000, function(){
            $(this).text(examples[hintCounter]);
            
            $(".speech-hand-animation").show();
        });
        hintCounter++;
    }

    var stopShowingHints = function (){
        print("stopShowingHints");
        clearTimeout(hintTimeoutId);
        clearInterval(hintIntervalId);
        $(".speech-hand-animation").hide();
    }

    var recordSpeech = function () {
        print("recordSpeech");
        hideIdleMic();
        showActiveMic();
        setNavigation(stopRecAndHideActiveMic, initIdleMic, translateInterpretedSpeechAndShow);
        recognition = new webkitSpeechRecognition();
        recognition.lang = lang;
        recognition.start();
        
        recognition.onerror = function () {
            print("recordSpeech error");
            //TODO
        };
        recognition.onresult = function (e) {
            print("recordSpeech result");
            inputSpeech = e.results[0][0].transcript;
            hideActiveMic();
            showInterepretedSpeech();
        };
    }

    var stopRecAndHideActiveMic = function () {
        print("stopRecAndHide");
        recognition.abort();
        hideActiveMic();
    }
    
    var hideActiveMic = function () {
        print("hideActiveMic");
        $("body").removeClass("mode-speech-in");
        $(".speech-mic").css({ // Changes the color of the mic-icon when clicked
            background: "#29cff5",
            border: "solid 0 #444"
        });
    }

    var showInterepretedSpeech = function () {
        print("showInterepretedSpeech");
        setNavigation(hideInterepretedSpeech, initIdleMic, translateInterpretedSpeechAndShow);
        $("body").addClass("mode-speech-start");
        $("body").addClass("mode-speech-out");
        $(".speech-out").text(inputSpeech);
        navAfterDur(4000);
    }    

    var hideInterepretedSpeech = function () {
        print("hideInterepretedSpeech");
        $("body").removeClass("mode-speech-out");
    }

    var removeMic=function(){
        print("removeMic");
        $("body").removeClass("mode-speech-start");
    }

    var showActiveMic = function (){
        print("showActiveMic");
        $(".speech-mic").css({ //TODO hardkoda
            background: "#ff5f63",
            border: "solid 0 #ff5f63"
        }
        );
        $("body").addClass("mode-speech-in");
    }
    
    var translateInterpretedSpeechAndShow = function () {
        print("translateInterpretedSpeechAndShow");
        preventNavigation();
        $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            url: tranUrl,
            data: JSON.stringify({
                "id": pid,
                "text": inputSpeech,
                "source": "no",
            }),
            error: function (textStatus) {
                print("Error: "+textStatus);
                //TODO
            },
            success: function (data) {
                print("Sucess: "+data);
                speechTxt = data[0].translatedText;
                removeMic();
                showTranslatedText();
            }
        });
        // inputTxt --> translateAPI
        // success --> speechTxt = data.string
    }

    var showTranslatedText = function(){
        print("showTranslatedText");
        setNavigation(hideTranslatedText,initIdleMic, naturalLanguage);//TODO fix
        $("body").addClass("mode-tran-loaded");
        $(".tran-word").text(inputSpeech);

        /*FOOTER LOADING ANIMATION*/
        tranTimeoutId= setTimeout(function () {
            $(".tran-footer").show();
        }, 500);

        navAfterDur(3000);
    }

    var hideTranslatedText = function (){
        $("body").removeClass("mode-tran-loaded");
        clearTimeout(tranTimeoutId);
        $(".tran-footer").hide();
    }

    // switch language
    $(".speech-lang a").click(function () {
        if ($(this).text() == "EN") {
            $(this).text("JP");
            lang = "ja";
        } else {
            $(this).text("EN");
            lang = "en";
        }
        recognition.lang = lang;
        return false;
    });

    var hideMorph = function(){
        print("hideMorph");
        $("dl").remove();
        $("dd").remove();
        $("body").removeClass("mode-nl-loaded");
        $(".nl-footer").hide();
        clearTimeout(morphLoadTimeoutId);
}

    var createAndShowMorph = function(){
        print("createAndShowMorph");
        data=morphData;
        setNavigation(hideMorph, showTranslatedText, noFunction);
        data = data.morphs
                for (var i in data) {
                    var morph = "";
                    for (key in data[i].pos) {
                        var txt = data[i].pos[key];
                        if (key != "tag" && txt.indexOf("UNKNOWN") == -1) {
                            morph += key + "=" + txt + "<br>";
                        }
                    }
                    var desc = "<dl>";
                    desc += "<dd class='nl-label'>" + data[i].depend.label + "</dd>";
                    desc += "<dd class='nl-word'>" + data[i].word + "</dd>";
                    desc += "<dd class='nl-tag'>" + data[i].pos.tag + "</dd>";
                    desc += "<dd class='nl-pos'>" + morph + "</dd>";
                    desc += "</dl>"
                    $(".nl-syntax").append(desc);


                    // generate arrow
                    for (var j in data[i].depend.index) {
                        $(".nl-depend").append("<dd data-from=" + i + " data-to=" + data[i].depend.index[j] + "></dd>");
                    }
                }
                // measure X coordinate
                var dependX = [];
                $(".nl-syntax dl").each(function (index) {
                    var x = $(".nl-syntax dl:nth-child(" + (index + 1) + ")").position().left;
                    var w = $(".nl-syntax dl:nth-child(" + (index + 1) + ")").outerWidth();
                    dependX.push(Math.round(x + w / 2));
                });

                // rearrange arrow
                $(".nl-depend dd").each(function (index) {
                    var from = $(this).data().from;
                    var to = $(this).data().to;
                    if (from < to) {
                        var x = dependX[from];
                        var w = dependX[to] - dependX[from];
                    } else {
                        var x = dependX[to];
                        var w = dependX[from] - dependX[to];
                        $(this).addClass("left");
                    }
                    $(this).css({
                        top: (Math.abs(from - to) - 1) * -30 + "px",
                        left: x + "px",
                        width: w + "px"
                    });
                });
                /*FOOTER LOADING ANIMATION*/
                morphLoadTimeoutId=setTimeout(function () {
                    $(".nl-footer").show();
                }, 1000);

                // effect settings
                $(".nl-word").each(function (index) {
                    $(this).css("transition-delay", index / 5 + "s");
                });
                $(".nl-tag, .nl-pos").each(function (index) {
                    $(this).css("transition-delay", 1 + index / 10 + "s");
                });
                $(".nl-label, .nl-depend dd").css("transition-delay", 3 + "s"); //endret fra 2.5
                $("body").addClass("mode-nl-loaded");
                
                findSimilarities();
                
    }

    // NL processing
    var naturalLanguage = function () {
        preventNavigation();
        print("naturalLanguage")
        morXHR = null;
        simXHR = null;

        morXHR = $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            url: morUrl,
            data: JSON.stringify({
                "id": pid,
                "text": speechTxt,
                "lang": lang
            }),
            error: function (jqXHR, textStatus) {
                hideTranslatedText();

                if (textStatus == 'abort') { return; }
                print(jqXHR);
                if (simXHR !== null && simXHR.readyState > 0 && simXHR.readyState < 4) {
                    simAjax.abort();
                }
                showSorryScreen();//TODO Better error handling
            },
            success: function (data) {
                hideTranslatedText();
                morphData=data;
                createAndShowMorph();
            }
        });        
    };

   var findSimilarities = function () {
       print("findSimilarities");
        simXHR = $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            url: simUrl,
            data: JSON.stringify({
                "id": pid,
                "text": speechTxt,
                "lang": lang
            }),
            error: function (jqXHR, textStatus) {
                if (textStatus == 'abort') { return; }
                print(jqXHR);
                if (morXHR !== null && morXHR.readyState > 0 && morXHR.readyState < 4) {
                    morXHR.abort();
                }
                showSorryScreen();//TODO
            },
            success: function (data) {
                print("found sim");
                print(data);
                sim = data;
                latesSmilaritiesAjaxData = data;
                setNavigation(hideMorph, showTranslatedText, showSimilarities);
                navAfterDur(10000);
            }
        });
    }

    var hideSimilarities = function (){
        print("hideSimilarities");
        clearTimeout(simTimeoutId);
        hideForce();
        hidePlot();
    }


    var showSimilarities = function(){
        print("showSimilarities");
        sim = latesSmilaritiesAjaxData;
        setNavigation(hideSimilarities, createAndShowMorph, noFunction);
        createAndDrawForce();
        plot();
        setNavigation(hideSimilarities, createAndShowMorph, cam);
        navAfterDur(4000);
        }

    var hideForce = function () {
        print("hideForce");
        $("body").removeClass("mode-force-start");
        $("div.force").empty();
    }

    // drow force layout
    var createAndDrawForce = function () {
        print("createAndDrawForce");
        $("body").addClass("mode-force-start");
        // generate dataset
        var data = sim.similarities.force;
        var dataSet = {
            "nodes": [],
            "links": []
        };
        for (var i in data) {
            dataSet.nodes.push(data[i]);
            dataSet.links.push({
                "source": 0,
                "target": parseInt(i) + 1
            });
        }
        // Add a node for input string at the beginning of the data set
        dataSet.nodes.unshift({
            "label": "",
            "lid": 0,
            "em": 0,
            "x": winW / 2,
            "y": winH / 2,
            "fixed": true
        });
        // create SVG
        var svg = d3.select(".force").append("svg").attr({
            width: winW,
            height: winH
        });
        // layout setttings
        var d3force = d3.layout.force()
            .nodes(dataSet.nodes)
            .links(dataSet.links)
            .size([winW, winH])
            .linkDistance(450)
            .charge(-1000)
            .start();
        var link = svg.selectAll("line")
            .data(dataSet.links)
            .enter()
            .append("line");
        var g = svg.selectAll("g")
            .data(dataSet.nodes)
            .enter()
            .append("g")
            .attr("class", function (d) {
                return "label-" + d.lid;
            });
        var circle = g.append("circle")
            .attr("r", function (d) {
                var r = 80 + d.em * 100;
                return r;
            });
        var label = g.append("text")
            .text(function (d) {
                //if (d.em > 0.50 && d.em < 1)
                print(d);
                return d.label;
                //else return d.label + " < 0.1";
            });
        // setting coordinate (input string（lid=0）fix the mid of display）
        d3force.on("tick", function () {
            g.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
            link.attr("x1", function (d) {
                return d.source.x;
            })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });
        });
        // Place the input character string in the center of the screen
        $(".force").prepend("<div class='force-txt'>" + speechTxt + "<div>");
        var txtW = $(".force-txt").outerWidth();
        var txtH = $(".force-txt").outerHeight();
        $(".force-txt").css({
            top: (winH - txtH) / 2 + "px",
            left: (winW - txtW) / 2 + "px"
        });
    };

    var hidePlot =function () {
        print("hidePlot");
        //$("[class^=label]").remove();
        $("dd").remove();
    }
    // draw scatter plot
    var plot = function () {
        print("plot");
        // generate dataset
        var data = sim.similarities.embedded;
        var dataSet = [];
        for (var i in data) {
            var em = 0; // extract height similarity
            var lid = 0;
            for (var j in data[i].similarities) {
                if (data[i].similarities[j].em > em) {
                    lid = data[i].similarities[j].lid;
                    em = data[i].similarities[j].em;
                }
            }
            dataSet.push({
                "x": data[i].coords[0] * winW,
                "y": data[i].coords[1] * winH,
                "img": data[i].url,
                "lid": lid
            });
        }
        // add nearest at the last of dataset
        data = sim.similarities.nearest;
        em = 0; // extract high similarity label
        lid = 0;
        for (var i in data.similarities) {
            if (data.similarities[i].em > em) {
                lid = data.similarities[i].lid;
                em = data.similarities[i].em;
                print("lid: " + lid + ", label: " + data.similarities[i].label + ", em: " + em);
            }
        }
        dataSet.push({
            "x": data.coords[0] * winW,
            "y": data.coords[1] * winH,
            "img": data.url,
            "lid": lid
        });
        $(".cam polygon").addClass("label-" + lid);
        // draw scatter plot
        for (var i in dataSet) {
            $(".plot").append("<dd><i></i></dd>");
            $(".plot dd:last-child").addClass("label-" + dataSet[i].lid)
                .css({
                    left: dataSet[i].x + "px",
                    top: dataSet[i].y + "px",
                    transitionDelay: parseInt(i) * 0.05 + "s",
                    animationDelay: parseInt(i) * 0.05 + "s"
                });
            $(".plot dd:last-child i")
                .css({
                    backgroundImage: "url(" + dataSet[i].img + ")"
                });
        }
        $(".plot dd:last-child").addClass("nearest");

    };
    var hideCam= function () { 
        print("hideCam");
        $("body").removeClass("mode-plot-end");
        $("body").removeClass("mode-cam-start");

    }

    // output camera image
    var cam = function () {
        print("cam");
        sim=latesSmilaritiesAjaxData;
        
        if(askEnabled){
            setNavigation(hideCam, showSimilarities, ask);//
        } else if (askInThankYouScreen){
            setNavigation(hideCam, showSimilarities, askAndThank);//
        } else {
            setNavigation(hideCam, showSimilarities, thanks);//
        }
        $("body").addClass("mode-plot-end");
        var imgUrl = sim.similarities.url; //denne blir undef etter nav fra spoer tilbake
        // retrieve image size
        var img = new Image();
        img.src = imgUrl;
        img.onload = function () {
            var w = img.width;
            var h = img.height;
            $(".cam-img svg").attr("viewBox", "0 0 " + w + " " + h);
            if (w > winW) {
                h = h / w * winW;
                w = winW;
            }
            if (h > winH) {
                w = w / h * winH;
                h = winH;
            }
            $(".cam-img").width(w).height(h);
        };
        // setting image
        $(".cam-img").css("background-image", "url(" + imgUrl + ")");
        var box = sim.similarities.nearest.box;
        $(".cam polygon").attr("points", box[0][0] + "," + box[0][1] + " " + box[1][0] + "," + box[1][1] + " " + box[2][0] + "," + box[2][1] + " " + box[3][0] + "," + box[3][1] + " ");
        // draw with time difference
            $("body").addClass("mode-cam-start");
            // operation of pickup
            $.ajax({
                type: "POST",
                contentType: "application/json",
                dataType: "json",
                url: pickUrl,
                data: JSON.stringify({
                    "id": pid
                }),
                error: function (textStatus) {
                    print(textStatus);
                },
                success: function (data) {
                    print(sim);
                    sim = data;
                }
            });

            navAfterDur(15000);
    };

    var hideThanks = function (){
        print("hideThanks");
        $("body").removeClass("mode-thanks-start");
        $("body").removeClass("mode-thanks-end");
        $("body").removeClass("mode-thanks-btn");
        clearTimeout(thanksTimeout1);
        clearTimeout(thanksTimeout2);
    }

    var hideAsk = function () {
        print("hideAsk");
        $("body").removeClass("mode-thanks-start");
    }

    var hideAskAndThank = function () {
        print("hideAskAndThank");
        $("body").removeClass("mode-thanks-start");
        $("body").removeClass("mode-thanks-end");
    }

    var hideThank = function () {
        print("hideThank");
        $("body").removeClass("mode-thanks-start");
        $("body").removeClass("mode-thanks-end");
        $("body").removeClass("mode-thanks-btn");
    }

    var ask = function () { //delay ved forovernav
        setNavigation(hideAsk, cam, thank);
        print("ask");
        $("body").addClass("mode-thanks-start");
        navAfterDur(4000);
    }

    var askAndThank = function () {
        print("askAndThank&t");
        setNavigation(hideAskAndThank, cam, initIdleMic);
        $("body").addClass("mode-thanks-start");
        $("body").addClass("mode-thanks-end");//TODO lag
        navAfterDur(10000);
    }

    var thank = function () {
        print("thank");
        if(askEnabled){
            setNavigation(hideThank, ask, initIdleMic);
        } else {
            setNavigation(hideThank, cam, initIdleMic);
        }
        
        $("body").addClass("mode-thanks-start");
        $("body").addClass("mode-thanks-end");
        $("body").addClass("mode-thanks-btn");
        navAfterDur(10000);
    }

    var showSorryScreen = function () {
        print("showSorryScreen");
        $("body").addClass("mode-sorry-p");
    };

      // Helper functions
      var print = function(txt){
        if(debug) console.log(txt);
    }

    var preventNavigation = function(){
        setNavigation(noFunction, noFunction, noFunction);
    }


    //Navigation logic
    function setNavigation(dismantleCurrentRunningFunction, functionToNavBack, functionToNavForward){
        forwardNavFunc=functionToNavForward;
        backwardNavFunc=functionToNavBack;
        funcToCancelRunningFunc=dismantleCurrentRunningFunction;
    }

    //Call this to enable "forwards navigation" after a given time
    function navAfterDur(durMax){
        maxWaitDurTime=Date.now()+durMax;
        keepCheckingDurNav=true;
        checkMaxDurPassed(maxWaitDurTime);
    }

    function navByClickOrDur(durMax,cancelThisFunc, functionBack, functionForward){
        setNavigation(cancelThisFunc, functionBack, functionForward);
        navAfterDur(durMax);
    }

    document.onkeydown = function(e){
        print("\n\nKeypress:"+e.keyCode);
        if(e.keyCode==waitKey){
            if(keepCheckingDurNav){
                keepCheckingDurNav=false;//automatic forwards navigation is prevented by 1 press of the wait key. 
            } else{
                navForwards();
            }
        } else if(e.keyCode==forwardKey){
            navForwards();
        } else if(e.keyCode==backKey){
            navBackwards();
        }
    };

    function checkMaxDurPassed(maxStamp){
        if(keepCheckingDurNav){
            if(Date.now()-maxStamp>=0){
                navForwards();
            } else {
                checkerTimeout = setTimeout(checkMaxDurPassed, checkFreq, maxStamp);
            }
        }
    }

    var navCleanUp = function(){
        keepCheckingDurNav=false;
        clearTimeout(checkerTimeout);
        funcToCancelRunningFunc();
        previousNavTime=Date.now();
    }

    var navForwards = function(){
        if(navigationDebounce()){
            navCleanUp();
            forwardNavFunc();
        }
    }

    var navBackwards = function(){
            navCleanUp();
            backwardNavFunc();
    }

    var navigationDebounce = function(){
        return Date.now()-previousNavTime>=navDebounceDur;
    }

        initIdleMic();
    });
