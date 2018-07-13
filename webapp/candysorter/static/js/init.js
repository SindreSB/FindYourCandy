$(function () {

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

    // variables
    var recognition = new webkitSpeechRecognition();
    var speechLang = "no"; //spoken language setting
    var lang = "en"; // language seting
    var inputSpeech = "Kan jeg få en smurf";
    var speechTxt = "";
    var sim = "";
    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var examples = ["\"Kan jeg få sjokolade?\"","\"Jeg liker smurf\"","\"Kan jeg få lakris?\"", "\"Kan jeg få noe søtt?\""]
    var box1 = "";
    var box2 = "";

    /* EXAMPLES OF WHAT TO SAY */
    // variable to keep track of last text displayed
    setTimeout(function () {
        var i = 0;
        var textTimer = function() {
            if (i >= examples.length) { i = 0; }
            $("#example-text").fadeOut(1000, function(){
                $(this).text(examples[i]);
            });
            $("#example-text").fadeIn();
            i++;
        }
        $(".speech-hand-animation").show();
        $("#example-text").text(examples[i++]); // initialize with first quote
        setInterval(textTimer, 3500);
    }, 15000);

    // process of voice recognition
    /* DISABLED FOR TESTING */
    /*
        var speech = function () {
            $("body").addClass("mode-speech-start");
            recognition.lang = lang;
            $(".speech-mic").click(function () {
                $(".speech-mic").css({ // Changes the color of the mic-icon when clicked
                    background: "#ff5f63",
                    border: "solid 0 #ff5f63"
                    }
                );
                $(".speech-footer").hide();
                $(".speech-hand-animation").hide();
                $("body").addClass("mode-speech-in");
                recognition.start();
            });
            recognition.onerror = function () {
                $("body").removeClass("mode-speech-in");
            };
            recognition.onresult = function (e) {
                inputSpeech = e.results[0][0].transcript
                //$(".speech-out").text(inputSpeech);
                $("body").addClass("mode-speech-out");
                setTimeout(function () {
                    translation();
                },3500);
            };
        }


    /*
    */

    var speech = function () {
        $("body").addClass("mode-speech-start");
        recognition.lang = lang;
        $(".speech-mic").click(function () {
            $(".speech-mic").css({ // Changes the color of the mic-icon when clicked
                    background: "#ff5f63",
                    border: "solid 0 #ff5f63"
                }
            );
            $(".speech-footer").hide();
            $(".speech-hand-animation").hide(); //Hide demo animation when record starts
            $("body").addClass("mode-speech-in");
            setTimeout(function () {
                translation();
            },3500);
        });
    }

    var translation = function () {
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
                console.log(textStatus);
            },
            success: function (data) {
                speechTxt = data[0].translatedText;
                $("body").addClass("mode-tran-loaded");
                $(".tran-word").text(inputSpeech);

                /*FOOTER LOADING ANIMATION*/
                setTimeout(function () {
                    $(".tran-footer").show();
                }, 500);
                setTimeout(function () {
                    nl()
                }, 4000);
            }
        });
        // inputTxt --> translateAPI
        // success --> speechTxt = data.string
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

    // NL processing
    var nl = function () {
        var morXHR = null;
        var simXHR = null;

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
                if (textStatus == 'abort') { return; }
                console.log(jqXHR);
                if (simXHR !== null && simXHR.readyState > 0 && simXHR.readyState < 4) {
                    simAjax.abort();
                }
                sorry();
            },
            success: function (data) {
                // remove translation UI
                $("body").addClass("mode-tran-finish");
                // generate morpheme
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
                setTimeout(function () {
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

                /*MAKES IT LOOK VERY CRASHED WHEN DISABLED WITHOUT FOOTER LOADING ANIMATION*/
                // repeat effects
                /*setInterval(function () {
                    $("body").addClass("mode-nl-repeat");
                    setTimeout(function () {
                        $("body").removeClass("mode-nl-loaded");
                    }, 400);
                    setTimeout(function () {
                        $("body").addClass("mode-nl-loaded");
                        $("body").removeClass("mode-nl-repeat");
                    }, 500);
                }, 6000);*/
            }
        });
        // retrieve inference data
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
                console.log(jqXHR);
                if (morXHR !== null && morXHR.readyState > 0 && morXHR.readyState < 4) {
                    morXHR.abort();
                }
                sorry();
            },
            success: function (data) {
                var sec = data.similarities.embedded.length >= simNoWaitNum ? 0 : simSec;
                sim = data;
                console.log("(sim = data) from simURL. Sim = ");
                console.log(sim);
                setTimeout(function () {
                    force();
                    plot();
                }, 5000);
            }
        });
    };

    // drow force layout
    var force = function () {
        $("body").addClass("mode-force-start");
        $(".force-footer").show();
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

    // draw scatter plot
    var plot = function () {
        // generate dataset
        var data = sim.similarities.embedded;
        box1 = sim.similarities.embedded[0].box;
        box2 = sim.similarities.embedded[1].box;
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
        /*data = sim.similarities.nearest;
        em = 0; // extract high similarity label
        lid = 0;
        for (var i in data.similarities) {
            if (data.similarities[i].em > em) {
                lid = data.similarities[i].lid;
                em = data.similarities[i].em;
            }
        }
        dataSet.push({
            "x": data.coords[0] * winW,
            "y": data.coords[1] * winH,
            "img": data.url,
            "lid": lid
        });

        $(".cam polygon").addClass("label-" + lid);
        console.log("label-" + lid);
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
            /*
              $(".plot dd:last-child i")
                .css({
                    backgroundImage: "url(" + dataSet[i].img + ")"
                });

        }
        */

        $(".plot dd:last-child").addClass("nearest");
        // draw with time difference
        setTimeout(function () {
            $("body").addClass("mode-plot-start");
        }, 6000); // WAS 3000; //How long just the circles are displayed
        setTimeout(function () {
            $("body").addClass("mode-plot-end");
            cam();
        }, 8000);//plotSec); //This times how long the camera images should be presented next to the circles
    };

    // output camera image
    var cam = function () {
        $("body").addClass("mode-cam-start");
        var imgUrl = sim.similarities.url;
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
        $(".cam polygon").addClass("polygon.label-1");
        $(".cam-img").css("background-image", "url(" + imgUrl + ")");
        var box = sim.similarities.nearest.box;
        $(".cam polygon").addClass("polygon.label-3");
        $(".cam polygon").attr("points", box[0][0] + "," + box[0][1] + " " + box[1][0] + "," + box[1][1] + " " + box[2][0] + "," + box[2][1] + " " + box[3][0] + "," + box[3][1] + " ");
       /*TESTING*/
        $(".cam #p1").addClass("polygon.label-2");
        $(".cam #p1").attr("points", box1[0][0] + "," + box1[0][1] + " " + box1[1][0] + "," + box1[1][1] + " " + box1[2][0] + "," + box1[2][1] + " " + box1[3][0] + "," + box1[3][1] + " ");
        $(".cam #p2").attr("points", box2[0][0] + "," + box2[0][1] + " " + box2[1][0] + "," + box2[1][1] + " " + box2[2][0] + "," + box2[2][1] + " " + box2[3][0] + "," + box2[3][1] + " ");

        $(".cam #c1").attr("cx", box[0][0]).attr("cy", box[0][1]);
        $(".cam #c2").attr("cx", box1[0][0]).attr("cy", box1[0][1]);
        $(".cam #c3").attr("cx", box2[0][0]).attr("cy", box2[0][1]);


        $(".cam #t1").attr("x", box[0][0]).attr("y", box[0][1]);
        $(".cam #t11").attr("x", box[0][0]).attr("y", (box[0][1])+15);
        $(".cam #t12").attr("x", box[0][0]).attr("y", (box[0][1])-15);
        $(".cam #t11").text(sim.similarities.nearest.similarities[1].label);
        $(".cam #t12").text(sim.similarities.nearest.similarities[1].em.toFixed(3)*100 + "%");

/*
        $(".cam #t2").attr("x", box1[0][0]).attr("y", box1[0][1]);
        $(".cam #t2").text(sim.similarities.embedded[1].similarities[2].label + ": " + sim.similarities.embedded[1].similarities[2].em.toFixed(3)*100 + "%");


        $(".cam #t3").attr("x", box2[0][0]).attr("y", box2[0][1]);
        $(".cam #t3").text(sim.similarities.embedded[0].similarities[2].label + ": " + sim.similarities.embedded[0].similarities[2].em.toFixed(3)*100 + "%");

*/
        $(".cam #t2").attr("x", box1[0][0]).attr("y", box1[0][1]);
        $(".cam #t21").attr("x", box1[0][0]).attr("y", (box1[0][1])+15);
        $(".cam #t22").attr("x", box1[0][0]).attr("y", (box1[0][1])-15);
        $(".cam #t21").text(sim.similarities.embedded[1].similarities[2].label);
        $(".cam #t22").text(sim.similarities.embedded[1].similarities[2].em.toFixed(3)*100 + "%");


        $(".cam #t3").attr("x", box2[0][0]).attr("y", box2[0][1]);
        $(".cam #t31").attr("x", box2[0][0]).attr("y", (box2[0][1])+15);
        $(".cam #t32").attr("x", box2[0][0]).attr("y", (box2[0][1])-15);
        $(".cam #t31").text(sim.similarities.embedded[0].similarities[2].label);
        $(".cam #t32").text(sim.similarities.embedded[0].similarities[2].em.toFixed(3)*100 + "%");








        /* /TESTING */

        // draw with time difference
        setTimeout(function () {
            $("body").addClass("mode-cam-end");
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
                    console.log(textStatus);
                },
                success: function (data) {
                    sim = data;
                }
            });
        }, 500);
        setTimeout(function () {
            thanks();
        }, 20000);//camSec);
    };

    // draw endroll
    var thanks = function () {
        $("body").addClass("mode-thanks-start");
        setTimeout(function () {
            $("body").addClass("mode-thanks-end");
        }, 3000);
        setTimeout(function () {
            $("body").addClass("mode-thanks-btn");
        }, 5000); //WAS 5000
    };

    // draw sorry
    var sorry = function () {
        $("body").addClass("mode-sorry-p");
    };

    speech();
});
